import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, X, LogIn } from "lucide-react";
import { toast } from "sonner";
import { criarPedidoCatalogo } from "@/lib/catalogo.functions";
import { useTarifaEntrega } from "@/hooks/use-tarifa-entrega";
import { PagamentoMercadoPago } from "@/components/catalogo/PagamentoMercadoPago";
import { useMpPublicConfig } from "../hooks/use-catalogo";
import { pagamentoOptions } from "../logic/pagamento";
import type { CartItem } from "../hooks/use-cart";
import { CheckoutCarrinho } from "./CheckoutCarrinho";
import { CheckoutDados, type CheckoutForm } from "./CheckoutDados";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { resolveAddressToPlace } from "@/lib/google-maps-places";

type Props = {
  slug: string;
  lojaId: string;
  lojaCoords: { lat: number | null; lng: number | null };
  taxaBase: number;
  cartItems: CartItem[];
  subtotal: number;
  onClose: () => void;
  onSuccess: (r: { id: string; numero: number }) => void;
  onInc: (lineId: string) => void;
  onDec: (lineId: string) => void;
  onRemove: (lineId: string) => void;
};

type Step = "carrinho" | "dados" | "pagar";

function validarOnline(form: CheckoutForm): string | null {
  if (!form.cliente_email.trim() || !/^\S+@\S+\.\S+$/.test(form.cliente_email)) {
    return "Informe um e-mail válido para o pagamento";
  }
  const doc = form.cliente_doc.replace(/\D/g, "");
  if (doc.length !== 11 && doc.length !== 14) {
    return "Informe CPF (11 dígitos) ou CNPJ (14 dígitos)";
  }
  return null;
}

export function CheckoutDialog({
  slug,
  lojaId,
  lojaCoords,
  taxaBase,
  cartItems,
  subtotal,
  onClose,
  onSuccess,
  onInc,
  onDec,
  onRemove,
}: Props) {
  const enviar = useServerFn(criarPedidoCatalogo);
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>("carrinho");
  const redirectPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : `/loja/${slug}`;
  const [form, setForm] = useState<CheckoutForm>({
    cliente_nome: "",
    cliente_telefone: "",
    cliente_email: "",
    cliente_doc: "",
    endereco_entrega: "",
    complemento: "",
    observacoes: "",
    forma_pagamento: "pix",
    troco_para: "",
  });
  const [pendentePagar, setPendentePagar] = useState<{ pendente_id: string } | null>(null);
  const [entregaCoords, setEntregaCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const { taxa: taxaCalculada, info: taxaInfo } = useTarifaEntrega(lojaId, lojaCoords, entregaCoords);
  const temCoords =
    entregaCoords.lat != null && entregaCoords.lng != null && lojaCoords.lat != null && lojaCoords.lng != null;
  const taxa = temCoords ? taxaCalculada : taxaBase;
  const total = subtotal + taxa;
  const [saving, setSaving] = useState(false);
  
  const sheetRef = useRef<HTMLDivElement>(null);

  const { data: mpConfig } = useMpPublicConfig(lojaId);
  const mpAtivo = !!mpConfig?.ativo && !!mpConfig.public_key;

  useEffect(() => {
    setForm((f) => {
      const opts = pagamentoOptions(mpAtivo).map((o) => o.v);
      if (!opts.includes(f.forma_pagamento)) {
        return { ...f, forma_pagamento: opts[0] };
      }
      return f;
    });
  }, [mpAtivo]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Pré-carrega o script de fingerprint do Mercado Pago para popular
    // window.MP_DEVICE_SESSION_ID cedo (reduz cc_rejected_high_risk).
    if (mpAtivo && typeof document !== "undefined" && !document.getElementById("mp-security-script")) {
      const s = document.createElement("script");
      s.id = "mp-security-script";
      s.src = "https://www.mercadopago.com/v2/security.js";
      s.async = true;
      s.setAttribute("view", "checkout");
      s.setAttribute("output", "MP_DEVICE_SESSION_ID");
      document.head.appendChild(s);
    }
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mpAtivo]);

  // Prefill cliente data (nome, telefone, endereço) a partir do perfil do marketplace.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user || cancelado) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, endereco, cpf")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelado) return;
      setForm((f) => ({
        ...f,
        cliente_nome: f.cliente_nome || profile?.full_name || "",
        cliente_telefone: f.cliente_telefone || profile?.phone || "",
        cliente_email: f.cliente_email || user.email || "",
        cliente_doc: f.cliente_doc || profile?.cpf || "",
        endereco_entrega: f.endereco_entrega || profile?.endereco || "",
      }));
      // Geocodifica endereço do perfil para calcular o frete automaticamente.
      if (profile?.endereco) {
        try {
          const place = await resolveAddressToPlace(profile.endereco);
          if (cancelado) return;
          setEntregaCoords({ lat: place.lat, lng: place.lng });
          setForm((f) => ({ ...f, endereco_entrega: f.endereco_entrega || place.address }));
        } catch {
          // sem coords — usuário pode reescrever no autocomplete
        }
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const isOnline = form.forma_pagamento === "pix_online" || form.forma_pagamento === "cartao_online";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isOnline) {
      const erro = validarOnline(form);
      if (erro) {
        toast.error(erro);
        return;
      }
    }
    setSaving(true);
    try {
      const res = await enviar({
        data: {
          loja_slug: slug,
          cliente_nome: form.cliente_nome,
          cliente_telefone: form.cliente_telefone,
          endereco_entrega: form.endereco_entrega,
          endereco_entrega_lat: entregaCoords.lat,
          endereco_entrega_lng: entregaCoords.lng,
          complemento: form.complemento || null,
          observacoes: form.observacoes || null,
          forma_pagamento: form.forma_pagamento,
          troco_para: form.forma_pagamento === "dinheiro" && form.troco_para ? Number(form.troco_para) : null,
          itens: cartItems.map((i) => ({
            produto_id: i.produto.id,
            qtd: i.qtd,
            adicionais: i.adicionais.map((a) => ({ opcao_id: a.opcao_id })),
          })),
        },
      });
      if (res.aguardando_pagamento && res.pendente_id) {
        setPendentePagar({ pendente_id: res.pendente_id });
        setStep("pagar");
      } else if (res.id && res.numero) {
        onSuccess({ id: res.id, numero: res.numero });
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao enviar pedido");
    } finally {
      setSaving(false);
    }
  }

  const title =
    step === "carrinho" ? "Seu carrinho" : step === "dados" ? "Dados de entrega" : "Pagamento";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-t-3xl md:rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-300"
      >
        <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0">
          <div className="h-1.5 w-12 rounded-full bg-border" />
        </div>

        <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {step === "dados" && (
              <button onClick={() => setStep("carrinho")} className="p-1 -ml-1 text-muted-foreground hover:text-foreground" aria-label="Voltar">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="font-display text-lg sm:text-xl truncate cc-ink-text tracking-tight">{title}</h2>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="p-2 -mr-2 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
          {step === "carrinho" && (
            <CheckoutCarrinho
              cartItems={cartItems}
              subtotal={subtotal}
              taxa={taxa}
              total={total}
              onInc={onInc}
              onDec={onDec}
              onRemove={onRemove}
            />
          )}

          {step === "dados" && (
            <CheckoutDados
              form={form}
              setForm={setForm}
              setEntregaCoords={setEntregaCoords}
              temCoords={temCoords}
              taxa={taxa}
              taxaInfo={taxaInfo}
              mpAtivo={mpAtivo}
              isOnline={isOnline}
              onSubmit={handleSubmit}
            />
          )}

          {step === "pagar" && pendentePagar && mpConfig?.public_key && (
            <PagamentoMercadoPago
              pendenteId={pendentePagar.pendente_id}
              valor={total}
              metodo={form.forma_pagamento as "pix_online" | "cartao_online"}
              publicKey={mpConfig.public_key}
              payerNome={form.cliente_nome}
              payerEmail={form.cliente_email}
              payerDoc={form.cliente_doc}
              onAprovado={(pedido) => onSuccess(pedido)}
              onTrocarParaPix={
                form.forma_pagamento === "cartao_online"
                  ? () => setForm((f) => ({ ...f, forma_pagamento: "pix_online" }))
                  : undefined
              }
            />
          )}
        </div>

        {step !== "pagar" && (
          <div className="border-t border-border p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] bg-card shrink-0">
            {step === "carrinho" ? (
              !authLoading && !user ? (
                <div className="space-y-2">
                  <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-[13px] text-foreground/90 flex items-center gap-2">
                    <LogIn className="h-4 w-4 shrink-0 text-primary" />
                    <span>Entre ou crie sua conta para finalizar o pedido. Seu carrinho fica salvo.</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/login"
                      search={{ redirect: redirectPath }}
                      className="cc-cta text-center px-4 py-3 rounded-2xl font-semibold uppercase text-[12px] tracking-[0.18em]"
                    >
                      Entrar
                    </Link>
                    <Link
                      to="/cadastro"
                      search={{ role: "cliente", redirect: redirectPath }}
                      className="text-center px-4 py-3 rounded-2xl font-semibold uppercase text-[12px] tracking-[0.18em] border border-primary/40 text-primary hover:bg-primary/10"
                    >
                      Criar conta
                    </Link>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setStep("dados")}
                  disabled={cartItems.length === 0 || authLoading}
                  className="cc-cta w-full px-5 py-3.5 rounded-2xl font-semibold uppercase text-[12px] tracking-[0.18em] disabled:opacity-40 flex items-center justify-between"
                >
                  <span>Continuar</span>
                  <span className="cc-price normal-case tracking-tight text-base">R$ {total.toFixed(2)}</span>
                </button>
              )
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Frete</span>
                  <span>R$ {taxa.toFixed(2)}</span>
                </div>
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={saving}
                  className="cc-cta w-full px-5 py-3.5 rounded-2xl font-semibold uppercase text-[12px] tracking-[0.18em] disabled:opacity-40 flex items-center justify-between"
                >
                  <span>{saving ? "Enviando..." : isOnline ? "Continuar para pagamento" : "Enviar pedido"}</span>
                  <span className="cc-price normal-case tracking-tight text-base">R$ {total.toFixed(2)}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
