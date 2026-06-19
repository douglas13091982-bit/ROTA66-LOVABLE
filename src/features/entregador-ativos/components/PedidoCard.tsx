import { useEffect, useRef, useState } from "react";
import { KeyRound, Loader2, MapPin, Navigation, Phone, TrendingUp } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ChatPedidoButton } from "@/components/ChatPedido";
import { formatDateTime } from "@/lib/format";
import { liquidoEntregador } from "@/hooks/use-taxa-sistema";
import type { PedidoAtivo } from "../logic/types";
import { useConfirmarEntrega } from "../hooks/use-confirmar-entrega";
import { PagamentoBadge } from "./PagamentoBadge";
import { abrirRetornoLoja } from "./RetornoLojaDialog";

type Props = {
  pedido: PedidoAtivo;
  destaque?: string;
  agrupado?: boolean;
};

export function PedidoCard({ pedido: p, destaque, agrupado }: Props) {
  const [revealedColeta, setRevealedColeta] = useState(false);
  const [revealedEntrega, setRevealedEntrega] = useState(false);
  const [codigoInput, setCodigoInput] = useState("");
  const { confirmar, loading, refresh } = useConfirmarEntrega(p.id);
  const taxaLoja = Number(p.loja_taxa_por_pedido ?? 0);

  const isColeta = p.status === "em_rota";
  const endereco = isColeta ? p.endereco_coleta : p.endereco_entrega;
  const codigoColeta = p.codigo_coleta;
  const badgeLabel = isColeta ? "Indo buscar" : "Em entrega";
  const isDestaque = destaque === p.id;
  const cardRef = useRef<HTMLDivElement>(null);
  const isCartao = p.forma_pagamento === "cartao" || p.forma_pagamento === "cartao_credito";

  useEffect(() => {
    if (isDestaque && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isDestaque]);

  async function onChange(v: string) {
    setCodigoInput(v);
    if (v.length === 4) {
      const ok = await confirmar(v);
      if (!ok) {
        setCodigoInput("");
        return;
      }
      if (isCartao && p.endereco_coleta) {
        abrirRetornoLoja(p.endereco_coleta);
      }
      refresh();
    }
  }


  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-2xl glass shadow-elevated p-5 md:p-6 transition-all duration-500 ease-premium ${
        isDestaque
          ? "border-2 border-primary ring-4 ring-primary/30 animate-pulse-once"
          : "border border-border/40"
      }`}
    >
      <div
        className={`absolute -top-24 -right-24 h-56 w-56 rounded-full blur-3xl pointer-events-none ${
          isColeta ? "bg-amber-500/15" : "bg-indigo-500/15"
        }`}
      />
      <div className="relative">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            <div className="font-display text-4xl md:text-5xl tracking-[0.06em] leading-none">
              #{p.numero}
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-1.5">
              {formatDateTime(p.updated_at)}
            </div>
            {p.duracao_estimada_seg != null && (
              <div className="mt-2 inline-flex items-center px-2.5 py-1 bg-indigo-500/15 backdrop-blur-sm border border-indigo-400/30 text-indigo-300 text-[10px] font-bold uppercase tracking-[0.18em] rounded-full">
                ETA {Math.max(1, Math.round(p.duracao_estimada_seg / 60))} min
                {p.distancia_metros != null && ` · ${(p.distancia_metros / 1000).toFixed(1)} km`}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span
              className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] rounded-full text-white backdrop-blur-sm border shadow-soft ${
                isColeta
                  ? "bg-amber-500/90 text-black border-amber-300/40"
                  : "bg-indigo-600/90 border-indigo-400/40"
              }`}
            >
              {badgeLabel}
            </span>
            {p.entrega_paga && (
              <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] rounded-full bg-emerald-500/90 text-white border border-emerald-300/40 shadow-[0_4px_16px_-4px_oklch(0.7_0.18_155_/_0.5)]">
                Pago
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm mb-4">
          <div className="font-bold text-base">{p.cliente_nome}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={`tel:${p.cliente_telefone}`}
              className="inline-flex items-center gap-2 text-primary hover:underline font-semibold"
            >
              <Phone className="h-4 w-4" /> {p.cliente_telefone}
            </a>
            <ChatPedidoButton
              pedidoId={p.id}
              pedidoNumero={Number(p.numero)}
              senderRole="entregador"
              contraparteNome="Loja"
            />
          </div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-3 font-bold">
            {isColeta ? "Endereço de coleta" : "Endereço de entrega"}
          </div>
          <div className="flex items-start gap-3">
            <div className="flex items-start gap-2 flex-1 min-w-0 bg-background/40 backdrop-blur-sm border border-border/40 rounded-lg px-3 py-2.5">
              <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span className="font-semibold">
                {endereco}
                {!isColeta && p.complemento ? `, ${p.complemento}` : ""}
              </span>
            </div>
            {endereco && (
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`}
                aria-label="Abrir rota no mapa"
                className="shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-gradient-red shadow-red text-primary-foreground hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-8px_oklch(0.55_0.21_27_/_0.6)] active:scale-95 transition-all duration-300 ease-premium"
              >
                <Navigation className="h-6 w-6" />
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] mt-0.5">
                  Mapa
                </span>
              </a>
            )}
          </div>
        </div>

        <PagamentoBadge forma={p.forma_pagamento} troco={p.troco_para} />

        {!agrupado && (
          <div className="border-y border-border/50 py-5 mb-4 flex items-center justify-center">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                Você recebe
              </div>
              <div className="font-display text-5xl md:text-6xl text-emerald-400 leading-none drop-shadow-[0_4px_24px_oklch(0.7_0.18_155_/_0.45)]">
                R$ {liquidoEntregador(p.taxa_entrega, taxaLoja, p.loja_plano_mensal_ativo).toFixed(2)}
              </div>
              {Number(p.bonus_entregador ?? 0) > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/90 text-white text-sm font-bold uppercase tracking-[0.14em] rounded-full shadow-[0_8px_24px_-6px_oklch(0.7_0.18_155_/_0.5)] backdrop-blur-sm border border-emerald-300/40">
                  <TrendingUp className="h-4 w-4" />+ R$ {Number(p.bonus_entregador).toFixed(2)} de
                  bônus
                </div>
              )}
            </div>
          </div>
        )}

        {isColeta ? (
          !revealedColeta ? (
            <button
              onClick={() => setRevealedColeta(true)}
              className="w-full px-5 py-4 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-sm tracking-[0.18em] rounded-xl hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-8px_oklch(0.55_0.21_27_/_0.6)] active:scale-[0.98] transition-all duration-300 ease-premium flex items-center justify-center gap-2"
            >
              Cheguei na coleta
            </button>
          ) : (
            <div className="rounded-xl border-2 border-primary/60 bg-primary/10 backdrop-blur-sm p-5 text-center shadow-soft">
              <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2 font-bold">
                <KeyRound className="h-3.5 w-3.5" /> Código de coleta
              </div>
              <div className="font-display text-5xl md:text-6xl tracking-[0.4em] text-primary mb-2 select-all drop-shadow-[0_4px_20px_oklch(0.55_0.21_27_/_0.5)]">
                {codigoColeta}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Mostre este código para a loja confirmar a coleta.
              </p>
            </div>
          )
        ) : !revealedEntrega ? (
          <button
            onClick={() => setRevealedEntrega(true)}
            className="w-full px-5 py-4 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-sm tracking-[0.18em] rounded-xl hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-8px_oklch(0.55_0.21_27_/_0.6)] active:scale-[0.98] transition-all duration-300 ease-premium flex items-center justify-center gap-2"
          >
            Cheguei na entrega
          </button>
        ) : (
          <div className="rounded-xl border-2 border-primary/60 bg-primary/10 backdrop-blur-sm p-5 space-y-3 shadow-soft">
            <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">
              <KeyRound className="h-3.5 w-3.5" /> Digite o código do cliente
            </div>
            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                value={codigoInput}
                onChange={onChange}
                disabled={loading}
                inputMode="numeric"
                pattern="[0-9]*"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-14 w-12 text-2xl" />
                  <InputOTPSlot index={1} className="h-14 w-12 text-2xl" />
                  <InputOTPSlot index={2} className="h-14 w-12 text-2xl" />
                  <InputOTPSlot index={3} className="h-14 w-12 text-2xl" />
                </InputOTPGroup>
              </InputOTP>
            </div>
            {loading && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Confirmando...
              </div>
            )}
            <p className="text-[11px] text-muted-foreground text-center">
              Peça ao cliente o código de 4 dígitos que aparece na página de rastreio.
            </p>
          </div>
        )}
      </div>
    </div>

  );
}
