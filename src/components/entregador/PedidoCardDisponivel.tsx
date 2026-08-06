import { CheckCircle2, MapPin, Package, Store, TrendingUp, XCircle } from "lucide-react";
import { extrairBairro } from "@/lib/endereco";
import { haversineKm, type LatLng } from "@/lib/geo";
import { liquidoEntregador } from "@/hooks/use-taxa-sistema";
import { segundosRestantesPedido } from "@/lib/oferta-timer";
import type { PedidoDisponivel } from "@/types/pedido";
import { formatDateTime } from "@/lib/format";

type Props = {
  pedido: PedidoDisponivel;
  minhaPos: LatLng | null;
  taxaParaExibir: (p: PedidoDisponivel) => number;
  nowMs: number;
  onAceitar: () => void;
  onRecusar: () => void;
};

function kmAteLojaTexto(pedido: PedidoDisponivel, minhaPos: LatLng | null): string | null {
  if (!minhaPos || pedido.endereco_coleta_lat == null || pedido.endereco_coleta_lng == null) {
    return null;
  }
  const km = haversineKm(
    minhaPos.lat,
    minhaPos.lng,
    Number(pedido.endereco_coleta_lat),
    Number(pedido.endereco_coleta_lng),
  );
  return km.toFixed(1);
}

export function PedidoCardDisponivel({
  pedido,
  minhaPos,
  taxaParaExibir,
  nowMs,
  onAceitar,
  onRecusar,
}: Props) {
  const kmAteLoja = kmAteLojaTexto(pedido, minhaPos);
  const taxaLoja = Number(pedido.loja_taxa_por_pedido ?? 0);
  const liquido = liquidoEntregador(taxaParaExibir(pedido), taxaLoja, pedido.loja_plano_mensal_ativo, pedido.forma_pagamento);
  const bairro = extrairBairro(pedido.endereco_entrega);
  const bonus = Number(pedido.bonus_entregador ?? 0);
  const segs = segundosRestantesPedido(pedido, nowMs);
  const expirou = segs !== null && segs <= 0;
  const ehCartao = (pedido.forma_pagamento ?? "").toLowerCase() === "cartao";


  return (
    <div className="pp-card relative overflow-hidden rounded-2xl p-5 md:p-6 animate-in fade-in zoom-in-95 duration-500 [animation-timing-function:cubic-bezier(0.22,1,0.36,1)]">
      <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full pointer-events-none" style={{ background: "oklch(0.78 0.16 75 / 0.12)", filter: "blur(56px)" }} />
      <div className="relative">
        <CabecalhoPedido pedido={pedido} />

        <div className="text-center mb-4 py-5 border-y border-[oklch(0.78_0.16_75_/_0.20)]">
          <div className="pp-eyebrow mb-2">Você recebe</div>
          <div
            className="pp-num text-5xl md:text-7xl leading-none font-semibold break-words"
            style={{
              backgroundImage: "var(--gradient-gold)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter: "drop-shadow(0 4px 28px oklch(0.78 0.16 75 / 0.38))",
            }}
          >
            R$ {liquido.toFixed(2)}
          </div>
          {pedido._externo && (
            <div className="pp-eyebrow mt-2" style={{ color: "oklch(0.82 0.16 80)" }}>
              Tarifa pela tabela global do sistema
            </div>
          )}
          {bonus > 0 && <BadgeBonus valor={bonus} />}
          <DistanciaLoja kmAteLoja={kmAteLoja} />
        </div>

        {ehCartao && (
          <div className="mb-4 rounded-lg border border-[oklch(0.78_0.16_75_/_0.35)] bg-[oklch(0.78_0.16_75_/_0.08)] px-3 py-2.5 text-[11px] font-semibold leading-snug text-[oklch(0.88_0.14_80)] text-center">
            💳 Cartão na entrega — você precisa retornar à loja para devolver a maquininha.
          </div>
        )}



        <BairroInfo bairro={bairro} />

        <div className="flex gap-2.5 items-center">
          <BotaoRecusar onClick={onRecusar} />
          <BotaoAceitar segs={segs} expirou={expirou} onClick={onAceitar} />
        </div>
      </div>
    </div>
  );
}

function CabecalhoPedido({ pedido }: { pedido: PedidoDisponivel }) {
  return (
    <div className="flex items-start justify-between mb-4 gap-3">
      <div>
        <div className="pp-num text-2xl tracking-[0.04em] text-white font-semibold">#{pedido.numero}</div>
        <div className="pp-eyebrow mt-1">
          {formatDateTime(pedido.created_at)}
        </div>
      </div>
      <span
        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] rounded-full border"
        style={
          pedido._externo
            ? { background: "oklch(0.78 0.16 75 / 0.15)", color: "oklch(0.88 0.14 80)", borderColor: "oklch(0.78 0.16 75 / 0.45)" }
            : { background: "oklch(0.55 0.21 27 / 0.18)", color: "oklch(0.92 0.10 27)", borderColor: "oklch(0.55 0.21 27 / 0.50)" }
        }
      >
        {pedido._externo ? "Pedido aberto" : "Pronto p/ retirar"}
      </span>
    </div>
  );
}

function BadgeBonus({ valor }: { valor: number }) {
  return (
    <div
      className="mt-4 inline-flex items-center gap-2.5 px-6 py-2.5 text-lg font-black uppercase tracking-[0.18em] rounded-2xl border-2"
      style={{
        background: "var(--gradient-gold)",
        color: "oklch(0.15 0.02 60)",
        borderColor: "oklch(0.88 0.14 80 / 0.8)",
        boxShadow: "0 10px 30px -8px oklch(0.78 0.16 75 / 0.6)",
      }}
    >
      <TrendingUp className="h-6 w-6 stroke-[3]" />
      <span>+ R$ {valor.toFixed(2).replace(".", ",")} BÔNUS</span>
    </div>
  );
}

function DistanciaLoja({ kmAteLoja }: { kmAteLoja: string | null }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-3 text-base font-semibold text-white/85">
      <Store className="h-5 w-5" style={{ color: "oklch(0.82 0.16 80)" }} />
      <span>{kmAteLoja ? `${kmAteLoja} km até a loja` : "Calculando distância…"}</span>
    </div>
  );
}

function BairroInfo({ bairro }: { bairro: string | null }) {
  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2.5 mb-4 text-xs text-white/60 text-center">
      <MapPin className="h-3.5 w-3.5 inline mr-1.5 opacity-70" />
      {bairro ? (
        <>
          Bairro: <span className="font-bold text-white">{bairro}</span>
          <span className="opacity-60"> · cliente liberado após aceitar</span>
        </>
      ) : (
        <>Dados do cliente liberados após aceitar o pedido</>
      )}
    </div>
  );
}

export function BotaoRecusar({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 h-14 text-white/75 font-semibold uppercase text-xs tracking-[0.22em] rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:text-white active:scale-[0.97] transition-all duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] flex items-center justify-center gap-1.5 basis-1/3"
    >
      <XCircle className="h-4 w-4" />
      Recusar
    </button>
  );
}

export function BotaoAceitar({
  segs,
  expirou,
  onClick,
  label = "Aceitar",
}: {
  segs: number | null;
  expirou: boolean;
  onClick: () => void;
  label?: string;
}) {
  const texto =
    segs !== null ? (expirou ? "Oferta expirada" : `${label} (${segs}s)`) : label;
  return (
    <button
      onClick={onClick}
      disabled={expirou}
      className="flex-1 min-w-0 px-3 h-14 whitespace-nowrap font-semibold uppercase text-sm sm:text-base tracking-[0.18em] rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all"
      style={{
        background: "linear-gradient(135deg, #AE0000, #8A0000)",
        boxShadow: "0 8px 22px -8px rgba(221, 0, 8, 0.7)",
      }}
    >
      <CheckCircle2 className="h-5 w-5 shrink-0" />
      <span className="truncate">{texto}</span>
    </button>
  );
}

export { Package };
