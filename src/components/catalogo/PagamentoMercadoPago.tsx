import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, CheckCircle2, Loader2, CreditCard, QrCode } from "lucide-react";
import { toast } from "sonner";
import { criarPagamentoPix, criarPagamentoCartao, consultarStatusPagamento } from "@/lib/mercadopago.functions";

declare global {
  interface Window {
    MercadoPago?: any;
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

interface Props {
  pedidoId: string;
  numero: number;
  valor: number;
  metodo: "pix_online" | "cartao_online";
  publicKey: string;
  payerNome: string;
  payerEmail: string;
  payerDoc: string;
  onAprovado: () => void;
}

export function PagamentoMercadoPago(props: Props) {
  if (props.metodo === "pix_online") return <PagamentoPix {...props} />;
  return <PagamentoCartao {...props} />;
}

function PagamentoPix({ pedidoId, valor, payerNome, payerEmail, payerDoc, onAprovado }: Props) {
  const criar = useServerFn(criarPagamentoPix);
  const consultar = useServerFn(consultarStatusPagamento);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [qr, setQr] = useState<{ code: string; base64: string } | null>(null);
  const [aprovado, setAprovado] = useState(false);
  const iniciou = useRef(false);

  useEffect(() => {
    if (iniciou.current) return;
    iniciou.current = true;
    (async () => {
      try {
        const res = await criar({
          data: { pedido_id: pedidoId, payer_email: payerEmail, payer_doc: payerDoc, payer_nome: payerNome },
        });
        setQr({ code: res.qr_code, base64: res.qr_code_base64 });
      } catch (e: any) {
        setErro(e?.message ?? "Falha ao gerar Pix");
      } finally {
        setLoading(false);
      }
    })();
  }, [pedidoId, payerEmail, payerDoc, payerNome, criar]);

  useEffect(() => {
    if (!qr || aprovado || erro) return;
    const tick = async () => {
      try {
        const r = await consultar({ data: { pedido_id: pedidoId } });
        if (r.aprovado_em || r.mp_status === "approved") {
          setAprovado(true);
          onAprovado();
        }
      } catch {
        /* ignore */
      }
    };
    const iv = setInterval(tick, 3500);
    return () => clearInterval(iv);
  }, [qr, aprovado, erro, pedidoId, consultar, onAprovado]);

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
      <p className="text-[11px] text-muted-foreground">O Pix expira em 30 minutos.</p>
    </div>
  );
}

function PagamentoCartao({ pedidoId, valor, publicKey, payerEmail, payerDoc, onAprovado }: Props) {
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

      // Descobrir payment_method_id pelo bin (MP exige 6 dígitos)
      if (cardNumber.length < 6) throw new Error("Número do cartão incompleto");
      let pm: any = null;
      try {
        const pmRes = await mpRef.current.getPaymentMethods({ bin: cardNumber.slice(0, 6) });
        pm = pmRes?.results?.[0];
      } catch (err) {
        console.error("[MP] getPaymentMethods erro", err);
      }
      if (!pm) {
        // Fallback: detecta bandeira local (Visa, Master, Amex, Elo, Hiper, Diners)
        const local = detectBrand(cardNumber);
        if (!local) throw new Error("Bandeira do cartão não reconhecida");
        pm = { id: local };
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
          pedido_id: pedidoId,
          card_token: tokenRes.id,
          installments: form.installments,
          payment_method_id: pm.id,
          issuer_id: pm.issuer?.id ? String(pm.issuer.id) : undefined,
          payer_email: payerEmail,
          payer_doc: payerDoc,
        },
      });
      if (res.aprovado) {
        setAprovado(true);
        onAprovado();
      } else {
        setErro(`Pagamento não aprovado: ${res.status_detail ?? res.status}`);
      }
    } catch (e: any) {
      setErro(e?.message ?? "Falha no pagamento");
    } finally {
      setSubmitting(false);
    }
  };

  if (aprovado) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
        <p className="font-bold">Pagamento aprovado!</p>
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
      {erro && <div className="text-xs text-destructive bg-destructive/10 rounded p-2">{erro}</div>}
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
