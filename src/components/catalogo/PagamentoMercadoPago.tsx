import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, CheckCircle2, Loader2, CreditCard, QrCode } from "lucide-react";
import { toast } from "sonner";
import { criarPagamentoPix, criarPagamentoCartao, consultarStatusPagamento } from "@/lib/mercadopago.functions";

declare global {
  interface Window {
    MercadoPago?: any;
    MP_DEVICE_SESSION_ID?: string;
  }
}

let sdkPromise: Promise<void> | null = null;
function loadMpSdk() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.MercadoPago) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://sdk.mercadopago.com/js/v2";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar SDK"));
    document.head.appendChild(s);
  });
  return sdkPromise;
}

// Injeta o script de fingerprint do Mercado Pago que popula window.MP_DEVICE_SESSION_ID.
// Reduz drasticamente cc_rejected_high_risk pois envia device fingerprint na cobrança.
let deviceScriptLoaded = false;
function loadMpDeviceScript() {
  if (typeof window === "undefined" || deviceScriptLoaded) return;
  deviceScriptLoaded = true;
  const existing = document.getElementById("mp-security-script");
  if (existing) return;
  const s = document.createElement("script");
  s.id = "mp-security-script";
  s.src = "https://www.mercadopago.com/v2/security.js";
  s.async = true;
  s.setAttribute("view", "checkout");
  s.setAttribute("output", "MP_DEVICE_SESSION_ID");
  document.head.appendChild(s);
}

function getDeviceId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const v = window.MP_DEVICE_SESSION_ID;
  return v && typeof v === "string" ? v : undefined;
}


function detectBrand(num: string): string | null {
  const n = num.replace(/\D/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n)) return "master";
  if (/^3[47]/.test(n)) return "amex";
  if (/^3(0[0-5]|[68])/.test(n)) return "diners";
  if (/^(4011|4312|4389|4514|4573|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(n)) return "elo";
  if (/^(606282|3841)/.test(n)) return "hipercard";
  return null;
}
function traduzirStatusMp(code: string): string {
  const c = String(code || "").toLowerCase();
  const map: Record<string, string> = {
    cc_rejected_high_risk:
      "Pagamento recusado pela análise de risco do Mercado Pago. Tente outro cartão ou pague via Pix.",
    cc_rejected_insufficient_amount: "Cartão sem limite disponível. Tente outro cartão ou pague via Pix.",
    cc_rejected_bad_filled_security_code: "CVV incorreto. Confira o código de segurança e tente novamente.",
    cc_rejected_bad_filled_date: "Data de validade incorreta. Confira e tente novamente.",
    cc_rejected_bad_filled_card_number: "Número do cartão incorreto. Confira e tente novamente.",
    cc_rejected_bad_filled_other: "Dados do cartão incorretos. Revise e tente novamente.",
    cc_rejected_call_for_authorize:
      "O banco exige autorização para esta compra. Ligue para o banco emissor do cartão ou tente outro cartão.",
    cc_rejected_card_disabled: "Cartão desativado. Contate o banco emissor ou use outro cartão.",
    cc_rejected_duplicated_payment:
      "Pagamento duplicado detectado. Aguarde alguns minutos ou use outro meio de pagamento.",
    cc_rejected_card_error: "Não foi possível processar este cartão. Tente outro cartão ou pague via Pix.",
    cc_rejected_max_attempts:
      "Muitas tentativas com este cartão. Tente outro cartão ou pague via Pix.",
    cc_rejected_invalid_installments: "Número de parcelas não permitido para este cartão.",
    cc_rejected_other_reason: "Pagamento recusado pelo emissor. Tente outro cartão ou pague via Pix.",
    cc_rejected_blacklist: "Cartão não autorizado. Use outro cartão ou pague via Pix.",
  };
  if (map[c]) return map[c];
  if (c.startsWith("cc_rejected"))
    return "Pagamento recusado pelo Mercado Pago. Tente outro cartão ou pague via Pix.";
  return `Pagamento não aprovado: ${code}`;
}


export interface PagamentoMpProps {
  pendenteId: string;
  valor: number;
  metodo: "pix_online" | "cartao_online";
  publicKey: string;
  payerNome: string;
  payerEmail: string;
  payerDoc: string;
  onAprovado: (pedido: { id: string; numero: number }) => void;
  onTrocarParaPix?: () => void;

}

export function PagamentoMercadoPago(props: PagamentoMpProps) {
  if (props.metodo === "pix_online") return <PagamentoPix {...props} />;
  return <PagamentoCartao {...props} />;
}

function PagamentoPix({ pendenteId, valor, payerNome, payerEmail, payerDoc, onAprovado }: PagamentoMpProps) {
  const criar = useServerFn(criarPagamentoPix);
  const consultar = useServerFn(consultarStatusPagamento);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [qr, setQr] = useState<{ code: string; base64: string } | null>(null);
  const [aprovado, setAprovado] = useState(false);
  const iniciou = useRef(false);

  useEffect(() => {
    loadMpDeviceScript();
  }, []);

  useEffect(() => {
    if (iniciou.current) return;
    iniciou.current = true;
    (async () => {
      try {
        // Aguarda até ~1.2s para o script de fingerprint popular MP_DEVICE_SESSION_ID
        let deviceId = getDeviceId();
        for (let i = 0; !deviceId && i < 12; i++) {
          await new Promise((r) => setTimeout(r, 100));
          deviceId = getDeviceId();
        }
        const res = await criar({
          data: {
            pendente_id: pendenteId,
            payer_email: payerEmail,
            payer_doc: payerDoc,
            payer_nome: payerNome,
            ...(deviceId ? { device_id: deviceId } : {}),
          },
        });
        setQr({ code: res.qr_code, base64: res.qr_code_base64 });
      } catch (e: any) {
        setErro(e?.message ?? "Falha ao gerar Pix");
      } finally {
        setLoading(false);
      }
    })();
  }, [pendenteId, payerEmail, payerDoc, payerNome, criar]);

  useEffect(() => {
    if (!qr || aprovado || erro) return;
    const tick = async () => {
      try {
        const r = await consultar({ data: { pendente_id: pendenteId } });
        if (r.aprovado && r.pedido_id && r.numero != null) {
          setAprovado(true);
          onAprovado({ id: r.pedido_id, numero: r.numero });
        }
      } catch {
        /* ignore */
      }
    };
    const iv = setInterval(tick, 3500);
    return () => clearInterval(iv);
  }, [qr, aprovado, erro, pendenteId, consultar, onAprovado]);

  const copiar = () => {
    if (!qr?.code) return;
    navigator.clipboard.writeText(qr.code);
    toast.success("Código Pix copiado");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Gerando Pix…</span>
      </div>
    );
  }
  if (erro) return <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">{erro}</div>;
  if (aprovado) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
        <p className="font-bold">Pagamento aprovado!</p>
        <p className="text-xs text-muted-foreground mt-1">Pedido criado.</p>
      </div>
    );
  }
  if (!qr) return null;

  return (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
        <QrCode className="h-4 w-4" /> Pix · R$ {valor.toFixed(2)}
      </div>
      {qr.base64 && (
        <img
          src={`data:image/png;base64,${qr.base64}`}
          alt="QR Code Pix"
          className="mx-auto h-56 w-56 bg-white p-2 rounded-lg border border-border"
        />
      )}
      <div>
        <textarea
          readOnly
          value={qr.code}
          rows={3}
          className="w-full text-[11px] bg-background border border-border rounded-md p-2 font-mono"
        />
        <button
          type="button"
          onClick={copiar}
          className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-bold uppercase tracking-wider hover:opacity-90"
        >
          <Copy className="h-3.5 w-3.5" /> Copiar código
        </button>
      </div>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Aguardando pagamento…
      </div>
      <p className="text-[11px] text-muted-foreground">
        O pedido será criado e enviado à loja somente após a confirmação do pagamento.
      </p>
    </div>
  );
}

function PagamentoCartao({ pendenteId, valor, publicKey, payerEmail, payerDoc, onAprovado, onTrocarParaPix }: PagamentoMpProps) {
  const criar = useServerFn(criarPagamentoCartao);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aprovado, setAprovado] = useState(false);
  const [form, setForm] = useState({
    cardNumber: "",
    holderName: "",
    expMonth: "",
    expYear: "",
    cvv: "",
    installments: 1,
  });
  const mpRef = useRef<any>(null);

  useEffect(() => {
    loadMpSdk()
      .then(() => {
        if (window.MercadoPago) {
          mpRef.current = new window.MercadoPago(publicKey, { locale: "pt-BR" });
          setReady(true);
        }
      })
      .catch((e) => setErro(e.message));
  }, [publicKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpRef.current) return;
    setErro(null);
    setSubmitting(true);
    try {
      const cardNumber = form.cardNumber.replace(/\s/g, "");
      const docDigits = payerDoc.replace(/\D/g, "");
      const docType = docDigits.length > 11 ? "CNPJ" : "CPF";

      if (cardNumber.length < 6) throw new Error("Número do cartão incompleto");
      const bin = cardNumber.slice(0, 6);

      // Preferencial: getInstallments retorna payment_method_id + issuer_id válidos p/ este BIN
      let paymentMethodId: string | null = null;
      let issuerId: string | undefined;
      try {
        const inst = await mpRef.current.getInstallments({
          amount: String(valor),
          bin,
          paymentTypeId: "credit_card",
        });
        const first = Array.isArray(inst) ? inst[0] : inst?.[0];
        if (first) {
          paymentMethodId = first.payment_method_id ?? null;
          issuerId = first.issuer?.id ? String(first.issuer.id) : undefined;
        }
      } catch (err) {
        console.warn("[MP] getInstallments falhou", err);
      }

      if (!paymentMethodId) {
        try {
          const pmRes = await mpRef.current.getPaymentMethods({ bin });
          const pm = pmRes?.results?.[0];
          if (pm) {
            paymentMethodId = pm.id;
            if (!issuerId && pm.issuer?.id) issuerId = String(pm.issuer.id);
          }
        } catch (err) {
          console.warn("[MP] getPaymentMethods falhou", err);
        }
      }

      if (!paymentMethodId) {
        const local = detectBrand(cardNumber);
        if (!local) throw new Error("Cartão não reconhecido. Verifique o número e tente novamente.");
        paymentMethodId = local;
      }

      const tokenRes = await mpRef.current.createCardToken({
        cardNumber,
        cardholderName: form.holderName,
        cardExpirationMonth: form.expMonth,
        cardExpirationYear: form.expYear.length === 2 ? `20${form.expYear}` : form.expYear,
        securityCode: form.cvv,
        identificationType: docType,
        identificationNumber: docDigits,
      });
      if (!tokenRes?.id) throw new Error("Não foi possível validar o cartão");

      const res = await criar({
        data: {
          pendente_id: pendenteId,
          card_token: tokenRes.id,
          installments: form.installments,
          payment_method_id: paymentMethodId,
          issuer_id: issuerId,
          payer_email: payerEmail,
          payer_doc: payerDoc,
        },
      });
      if (res.aprovado && res.pedido_id && res.numero != null) {
        setAprovado(true);
        onAprovado({ id: res.pedido_id, numero: res.numero });
      } else {
        setErro(traduzirStatusMp(res.status_detail ?? res.status ?? ""));
      }

    } catch (e: any) {
      const raw = String(e?.message ?? "");
      let msg = raw || "Falha no pagamento";
      if (raw.includes("not_result_by_params")) {
        msg = "Não foi possível validar este cartão. Confira número, validade e CVV e tente novamente.";
      } else if (raw.includes("invalid_card_number") || raw.includes("E301")) {
        msg = "Número do cartão inválido.";
      } else if (raw.includes("invalid_expiration") || raw.includes("324")) {
        msg = "Validade do cartão inválida.";
      } else if (raw.includes("invalid_security_code") || raw.includes("E302")) {
        msg = "CVV inválido.";
      }
      setErro(msg);
    } finally {
      setSubmitting(false);
    }
  };


  if (aprovado) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
        <p className="font-bold">Pagamento aprovado!</p>
        <p className="text-xs text-muted-foreground mt-1">Pedido criado.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
        <CreditCard className="h-4 w-4" /> Cartão · R$ {valor.toFixed(2)}
      </div>
      <Input
        label="Número do cartão"
        value={form.cardNumber}
        onChange={(v) => setForm({ ...form, cardNumber: v.replace(/\D/g, "").slice(0, 19) })}
        inputMode="numeric"
        placeholder="0000 0000 0000 0000"
      />
      <Input
        label="Nome impresso"
        value={form.holderName}
        onChange={(v) => setForm({ ...form, holderName: v.toUpperCase() })}
        placeholder="COMO ESTÁ NO CARTÃO"
      />
      <div className="grid grid-cols-3 gap-2">
        <Input
          label="Mês"
          value={form.expMonth}
          onChange={(v) => setForm({ ...form, expMonth: v.replace(/\D/g, "").slice(0, 2) })}
          inputMode="numeric"
          placeholder="MM"
        />
        <Input
          label="Ano"
          value={form.expYear}
          onChange={(v) => setForm({ ...form, expYear: v.replace(/\D/g, "").slice(0, 4) })}
          inputMode="numeric"
          placeholder="AAAA"
        />
        <Input
          label="CVV"
          value={form.cvv}
          onChange={(v) => setForm({ ...form, cvv: v.replace(/\D/g, "").slice(0, 4) })}
          inputMode="numeric"
          placeholder="000"
        />
      </div>
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Parcelas</span>
        <select
          value={form.installments}
          onChange={(e) => setForm({ ...form, installments: Number(e.target.value) })}
          className="w-full mt-1 px-3 py-3 bg-background border border-border rounded-xl text-[15px] focus:outline-none focus:border-primary"
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n}x de R$ {(valor / n).toFixed(2)}
              {n === 1 ? " à vista" : ""}
            </option>
          ))}
        </select>
      </label>
      {erro && (
        <div className="text-xs text-destructive bg-destructive/10 rounded p-2 space-y-2">
          <div>{erro}</div>
          {onTrocarParaPix && (
            <button
              type="button"
              onClick={onTrocarParaPix}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-destructive text-destructive-foreground rounded-md font-bold uppercase text-[11px] tracking-wider hover:opacity-90"
            >
              <QrCode className="h-3.5 w-3.5" /> Pagar com Pix
            </button>
          )}
        </div>
      )}
      <button
        type="submit"
        disabled={!ready || submitting}
        className="w-full px-5 py-3.5 bg-gradient-red shadow-red text-primary-foreground rounded-xl font-bold uppercase text-sm tracking-wider hover:opacity-90 disabled:opacity-40"
      >
        {submitting ? "Processando..." : !ready ? "Carregando..." : `Pagar R$ ${valor.toFixed(2)}`}
      </button>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  inputMode,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "numeric" | "decimal" | "text" | "tel";
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        placeholder={placeholder}
        className="w-full mt-1 px-3 py-3 bg-background border border-border rounded-xl text-[15px] focus:outline-none focus:border-primary"
      />
    </label>
  );
}
