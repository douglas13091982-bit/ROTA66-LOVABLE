import { Package, Route as RouteIcon, Store, TrendingUp } from "lucide-react";
import { extrairBairro } from "@/lib/endereco";
import { haversineKm, type LatLng } from "@/lib/geo";
import { liquidoEntregador } from "@/hooks/use-taxa-sistema";
import { segundosRestantesGrupo } from "@/lib/oferta-timer";
import type { GrupoPedido, PedidoDisponivel } from "@/types/pedido";
import { BotaoAceitar, BotaoRecusar } from "./PedidoCardDisponivel";

type Props = {
  grupo: GrupoPedido;
  minhaPos: LatLng | null;
  taxaSistema: number;
  taxaParaExibir: (p: PedidoDisponivel) => number;
  nowMs: number;
  onAceitar: () => void;
  onRecusar: () => void;
};

function calcularTotais(items: PedidoDisponivel[], taxaSistema: number, taxaParaExibir: (p: PedidoDisponivel) => number) {
  const totalLiquido = items.reduce(
    (s, p) => s + liquidoEntregador(taxaParaExibir(p), taxaSistema),
    0,
  );
  const totalBonus = items.reduce(
    (s, p) => s + Number(p.bonus_entregador ?? 0),
    0,
  );
  return { totalLiquido, totalBonus };
}

function kmAteLojaDoGrupo(items: PedidoDisponivel[], minhaPos: LatLng | null): string | null {
  if (!minhaPos) return null;
  const coletaRef = items.find(
    (p) => p.endereco_coleta_lat != null && p.endereco_coleta_lng != null,
  );
  if (!coletaRef) return null;
  return haversineKm(
    minhaPos.lat,
    minhaPos.lng,
    Number(coletaRef.endereco_coleta_lat),
    Number(coletaRef.endereco_coleta_lng),
  ).toFixed(1);
}

function bairrosUnicos(items: PedidoDisponivel[]): string[] {
  return Array.from(
    new Set(
      items
        .map((p) => extrairBairro(p.endereco_entrega))
        .filter((b): b is string => !!b),
    ),
  );
}

export function RotaCardDisponivel({
  grupo,
  minhaPos,
  taxaSistema,
  taxaParaExibir,
  nowMs,
  onAceitar,
  onRecusar,
}: Props) {
  const { items } = grupo;
  const { totalLiquido, totalBonus } = calcularTotais(items, taxaSistema, taxaParaExibir);
  const kmAteLoja = kmAteLojaDoGrupo(items, minhaPos);
  const bairros = bairrosUnicos(items);
  const segs = segundosRestantesGrupo(items, nowMs);
  const expirou = segs !== null && segs <= 0;
  const temCartao = items.some(
    (p) => (p.forma_pagamento ?? "").toLowerCase() === "cartao",
  );


  return (
    <div className="pp-card relative overflow-hidden rounded-2xl p-5 md:p-6 animate-in fade-in zoom-in-95 duration-500 [animation-timing-function:cubic-bezier(0.22,1,0.36,1)]" style={{ borderColor: "oklch(0.78 0.16 75 / 0.50)" }}>
      <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full pointer-events-none" style={{ background: "oklch(0.78 0.16 75 / 0.18)", filter: "blur(56px)" }} />
      <div className="relative">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <RouteIcon className="h-5 w-5" style={{ color: "oklch(0.82 0.16 80)" }} />
              <div className="pp-num text-2xl tracking-[0.04em] text-white font-semibold">
                Rota com {items.length} pedidos
              </div>
            </div>
            <div className="pp-eyebrow mt-1">
              {new Date(items[0].created_at).toLocaleString("pt-BR")}
            </div>
          </div>
          <span
            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] rounded-full border"
            style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.02 60)", borderColor: "oklch(0.88 0.14 80 / 0.6)", boxShadow: "0 8px 24px -8px oklch(0.78 0.16 75 / 0.6)" }}
          >
            Agrupada
          </span>
        </div>

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
            R$ {totalLiquido.toFixed(2)}
          </div>
          {totalBonus > 0 && (
            <div
              className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.18em] rounded-full border"
              style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.02 60)", borderColor: "oklch(0.88 0.14 80 / 0.6)", boxShadow: "0 8px 24px -6px oklch(0.78 0.16 75 / 0.5)" }}
            >
              <TrendingUp className="h-4 w-4" />+ R$ {totalBonus.toFixed(2)}
            </div>
          )}
          <div className="flex items-center justify-center gap-2 mt-3 text-base font-semibold text-white/85">
            <Store className="h-5 w-5" style={{ color: "oklch(0.82 0.16 80)" }} />
            <span>{kmAteLoja ? `${kmAteLoja} km até a loja` : "Calculando distância…"}</span>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/8 rounded-lg px-3 py-2.5 mb-4 text-xs text-white/60 text-center">
          <Package className="h-3.5 w-3.5 inline mr-1.5 opacity-70" />
          {items.length} entregas no mesmo trajeto
          {bairros.length > 0 && (
            <> — <span className="font-bold text-white">{bairros.join(" · ")}</span></>
          )}
        </div>

        {temCartao && (
          <div className="mb-4 rounded-lg border border-[oklch(0.78_0.16_75_/_0.35)] bg-[oklch(0.78_0.16_75_/_0.08)] px-3 py-2.5 text-[11px] font-semibold leading-snug text-[oklch(0.88_0.14_80)] text-center">
            💳 Cartão na entrega em pedido desta rota — taxa dobrada: retorno à loja para devolver a maquininha.
          </div>
        )}



        <div className="flex gap-2.5 items-stretch">
          <BotaoRecusar onClick={onRecusar} />
          <BotaoAceitar segs={segs} expirou={expirou} onClick={onAceitar} label="Aceitar Rota" />
        </div>
      </div>
    </div>
  );
}
