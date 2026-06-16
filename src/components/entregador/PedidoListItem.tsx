import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { haversineKm, type LatLng } from "@/lib/geo";
import { resumirEnderecoEntrega } from "@/lib/endereco";
import { liquidoEntregador } from "@/hooks/use-taxa-sistema";
import type { GrupoPedido, PedidoDisponivel } from "@/types/pedido";

type Props = {
  grupo: GrupoPedido;
  minhaPos: LatLng | null;
  taxaSistema: number;
  taxaParaExibir: (p: PedidoDisponivel) => number;
  onAceitar: (grupo: GrupoPedido) => void;
};

// Arredonda para ~11m (4 casas decimais) — evita re-render a cada drift
// minúsculo do GPS. Os km exibidos têm 1 casa decimal, então é seguro.
function roundPos(p: LatLng | null): string {
  if (!p) return "";
  return `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
}

function kmAteLoja(p: PedidoDisponivel, minhaPos: LatLng | null): string | null {
  if (!minhaPos || p.endereco_coleta_lat == null || p.endereco_coleta_lng == null) return null;
  const km = haversineKm(
    minhaPos.lat,
    minhaPos.lng,
    Number(p.endereco_coleta_lat),
    Number(p.endereco_coleta_lng),
  );
  return km.toFixed(1);
}

function kmEntrega(p: PedidoDisponivel): string | null {
  if (
    p.endereco_coleta_lat == null ||
    p.endereco_coleta_lng == null ||
    p.endereco_entrega_lat == null ||
    p.endereco_entrega_lng == null
  )
    return null;
  const km = haversineKm(
    Number(p.endereco_coleta_lat),
    Number(p.endereco_coleta_lng),
    Number(p.endereco_entrega_lat),
    Number(p.endereco_entrega_lng),
  );
  return km.toFixed(1);
}

function PedidoListItemBase({
  grupo,
  minhaPos,
  taxaSistema,
  taxaParaExibir,
  onAceitar,
}: Props) {
  const principal = grupo.items[0];
  const total = useMemo(
    () =>
      grupo.items.reduce(
        (s, p) => s + liquidoEntregador(taxaParaExibir(p), taxaSistema, p.loja_plano_mensal_ativo),
        0,
      ),
    [grupo.items, taxaParaExibir, taxaSistema],
  );
  const km = kmAteLoja(principal, minhaPos);
  const distEntrega = kmEntrega(principal);
  const nomeLoja = principal.loja_nome || "Loja";
  const bairroLoja = principal.loja_bairro;
  const endereco = resumirEnderecoEntrega(principal.endereco_entrega);

  const handleAceitar = useCallback(() => onAceitar(grupo), [onAceitar, grupo]);

  return (
    <div
      className="relative rounded-xl px-4 py-3.5 mb-3 transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: "oklch(0.13 0.012 260)",
        border: "1px solid oklch(1 0 0 / 0.06)",
        boxShadow: "0 8px 24px -16px oklch(0 0 0 / 0.6)",
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 text-[12px] font-semibold">
          <span style={{ color: "oklch(0.68 0.20 27)" }}>#{principal.numero}</span>
          {grupo.items.length > 1 && (
            <span
              className="text-[10px] font-bold uppercase tracking-[0.18em] px-1.5 py-0.5 rounded"
              style={{ background: "oklch(0.78 0.16 75 / 0.15)", color: "oklch(0.85 0.15 80)" }}
            >
              ROTA · {grupo.items.length}
            </span>
          )}
          {km && (
            <>
              <span className="text-white/30">·</span>
              <span className="text-white/55">{km} km</span>
            </>
          )}
          {(principal.forma_pagamento ?? "").toLowerCase() === "cartao" && (
            <span
              className="text-[10px] font-bold uppercase tracking-[0.18em] px-1.5 py-0.5 rounded"
              style={{ background: "oklch(0.55 0.18 145 / 0.25)", color: "oklch(0.82 0.14 145)" }}
            >
              💳 RETORNAR
            </span>
          )}
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">
          R$ {total.toFixed(2).replace(".", ",")}
        </div>
      </div>

      <div className="space-y-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[15px] font-bold text-white leading-tight">
            <span className="truncate">{nomeLoja}</span>
            {bairroLoja && (
              <span className="text-[11px] font-bold text-emerald-400 shrink-0">
                {bairroLoja}
              </span>
            )}
          </div>
          <div className="mt-0.5 leading-snug">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[13px] font-bold text-yellow-400">Entrega</span>
              <span className="text-[11.5px] text-white/55">
                {endereco}
                {distEntrega && (
                  <span className="text-white/75 font-semibold ml-1">· {distEntrega} km</span>
                )}
              </span>
            </div>
          </div>
        </div>
        <BotaoAceitarPress onAceitar={handleAceitar} />
      </div>
    </div>
  );
}

// Memo com comparador estável: a lista re-renderiza a cada tick de polling
// (5s pool + 15s rota + 30s ganho). Sem isso, cada card refaz todo o cálculo
// de tarifa/haversine em loop. Posição arredondada para evitar re-render a
// cada drift de GPS.
export const PedidoListItem = memo(PedidoListItemBase, (prev, next) => {
  if (prev.onAceitar !== next.onAceitar) return false;
  if (prev.taxaSistema !== next.taxaSistema) return false;
  if (prev.taxaParaExibir !== next.taxaParaExibir) return false;
  if (prev.grupo !== next.grupo) return false;
  return roundPos(prev.minhaPos) === roundPos(next.minhaPos);
});

function BotaoAceitarPress({
  onAceitar,
  label = "Aceitar",
}: {
  onAceitar: () => void;
  label?: string;
}) {
  const [progresso, setProgresso] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number | null>(null);
  const duracao = 1500;

  const start = useCallback(() => {
    startRef.current = Date.now();
    setProgresso(0);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - (startRef.current || 0);
      const pct = Math.min((elapsed / duracao) * 100, 100);
      setProgresso(pct);
      if (pct >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        onAceitar();
      }
    }, 16);
  }, [onAceitar]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgresso(0);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <button
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      className="relative w-full h-10 text-white text-[11px] font-bold uppercase tracking-[0.18em] rounded-lg active:scale-95 transition-all duration-200 overflow-hidden select-none"
      style={{
        background: "linear-gradient(135deg, #dd0008, #b00006)",
        boxShadow: "0 6px 18px -6px rgba(221, 0, 8, 0.7)",
      }}
    >
      <span className="relative z-10">{progresso > 0 ? "Segure..." : label}</span>
      <div
        className="absolute inset-0 bg-white/25 transition-all duration-75 ease-linear"
        style={{ width: `${progresso}%` }}
      />
    </button>
  );
}
