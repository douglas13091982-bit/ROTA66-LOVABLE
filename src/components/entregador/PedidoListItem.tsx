import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Store, MapPin, ArrowRight, CreditCard, TrendingUp } from "lucide-react";
import { haversineKm, type LatLng } from "@/lib/geo";
import { resumirEnderecoEntrega } from "@/lib/endereco";

import { ATRASO_POOL_MINUTOS } from "@/lib/pedido-atraso";
import type { GrupoPedido, PedidoDisponivel } from "@/types/pedido";

type Props = {
  grupo: GrupoPedido;
  minhaPos: LatLng | null;
  taxaParaExibir: (p: PedidoDisponivel) => number;
  onAceitar: (grupo: GrupoPedido) => void;
  onRecusar?: () => void;
  /** Minutos que o pedido mais antigo do grupo está no pool. */
  minutosAtraso?: number;
};


// Paleta de marca Rota 66
const BRAND = {
  red: "#AE0000",
  navy: "#0D2B45",
  navySoft: "#FFFFFF",
  gray: "#6B7688",
} as const;

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
  taxaParaExibir,
  onAceitar,
  onRecusar,
  minutosAtraso = 0,
}: Props) {

  const principal = grupo.items[0];
  const atrasado = minutosAtraso >= ATRASO_POOL_MINUTOS;
  const totalBonus = useMemo(
    () => grupo.items.reduce((s, p) => s + Number(p.bonus_entregador ?? 0), 0),
    [grupo.items],
  );
  const total = useMemo(
    () =>
      grupo.items.reduce((s, p) => s + taxaParaExibir(p), 0) + totalBonus,
    [grupo.items, taxaParaExibir, totalBonus],
  );

  const kmLoja = kmAteLoja(principal, minhaPos);
  const distEntrega = kmEntrega(principal);
  const nomeLoja = principal.loja_nome || "Loja";
  const bairroLoja = principal.loja_bairro;
  const endereco = resumirEnderecoEntrega(principal.endereco_entrega);
  const ehRota = grupo.items.length > 1;
  const ehCartao = ["cartao", "cartao_credito", "cartao_debito"].includes(
    (principal.forma_pagamento ?? "").toLowerCase(),
  );

  const handleAceitar = useCallback(() => onAceitar(grupo), [onAceitar, grupo]);

  return (
    <div
      className="pedido-list-card relative mb-4 overflow-hidden"
      style={{
        background: BRAND.navySoft,
        borderRadius: 22,
        border: `1px solid #e4e8ef`,
        boxShadow: "0 1px 2px rgba(15,27,45,0.05), 0 12px 30px -22px rgba(15,27,45,0.30)",
      }}
    >
      {/* Header: status + valor */}
      <div
        data-surface="red"
        className="px-5 py-4 flex items-center justify-between"
        style={{ background: BRAND.red }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {atrasado ? (
            <>
              <div className="p-2 rounded-xl bg-white/15">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black text-white uppercase tracking-[0.18em] leading-none">
                  Atrasado
                </span>
                <span className="text-sm font-black text-white leading-tight mt-0.5">
                  {minutosAtraso} min
                </span>
              </div>
            </>
          ) : (
            <>
              <span
                className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                #{principal.numero}
              </span>
              {ehRota && (
                <span
                  className="text-[10px] font-black uppercase tracking-[0.18em] px-2 py-1 rounded-lg"
                  style={{ background: BRAND.red, color: "#fff" }}
                >
                  Rota · {grupo.items.length}
                </span>
              )}
            </>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Ganhos</p>
          <p className="text-2xl font-black text-white tracking-tight tabular-nums">
            R$ {total.toFixed(2).replace(".", ",")}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-5">
        {/* Timeline: loja → cliente */}
        <div className="relative">
          <div
            className="absolute left-[23px] top-11 bottom-11 w-[2px]"
            style={{ background: "#e4e8ef" }}
          />

          {/* Loja (coleta) */}
          <div className="flex items-start gap-4 relative">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "#f1f3f7", border: "1px solid #e4e8ef" }}
            >
              <Store className="h-5 w-5" style={{ color: BRAND.gray }} />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-black text-[#0f1b2d] uppercase tracking-wide truncate">
                  {nomeLoja}
                </h3>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: BRAND.gray }}>
                {bairroLoja || "Loja"}
                {kmLoja && <span className="ml-1.5 text-[#6B7688]">· {kmLoja} km</span>}
              </p>
            </div>
          </div>

          <div className="h-4" />

          {/* Cliente (entrega) */}
          <div className="flex items-start gap-4 relative">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(174,0,0,0.10)", border: "1px solid rgba(174,0,0,0.25)" }}
            >
              <MapPin className="h-5 w-5" style={{ color: BRAND.red }} />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              {ehRota ? (
                <>
                  <h3 className="text-[13px] font-bold text-[#0f1b2d] leading-tight">
                    {grupo.items.length} entregas agrupadas
                  </h3>
                  <p className="text-[11px] font-medium mt-0.5" style={{ color: BRAND.gray }}>
                    Endereços liberados após aceitar
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-[13px] font-bold text-[#0f1b2d] leading-tight truncate">
                    {endereco || "Cliente"}
                  </h3>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: BRAND.gray }}>
                    Cliente
                    {distEntrega && <span className="ml-1.5 text-[#6B7688]">· {distEntrega} km</span>}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-2xl px-3 py-3 flex flex-col items-center justify-center"
            style={{ background: "#f1f3f7", border: "1px solid #e4e8ef" }}
          >
            <span className="text-[9px] font-black uppercase tracking-[0.18em] mb-1" style={{ color: BRAND.gray }}>
              Distância
            </span>
            <span className="text-base font-black text-[#0f1b2d] tabular-nums">
              {distEntrega ?? kmLoja ?? "—"}
              <span className="text-[10px] font-bold ml-1" style={{ color: BRAND.gray }}>KM</span>
            </span>
          </div>
          <div
            className="rounded-2xl px-3 py-3 flex flex-col items-center justify-center"
            style={{ background: "#f1f3f7", border: "1px solid #e4e8ef" }}
          >
            <span className="text-[9px] font-black uppercase tracking-[0.18em] mb-1" style={{ color: BRAND.gray }}>
              Chamada
            </span>
            <span className="text-base font-black text-[#0f1b2d] tabular-nums">
              #{principal.numero}
            </span>
          </div>
        </div>

        {/* Extras: bônus + retornar troco */}
        {(totalBonus > 0 || ehCartao) && (
          <div className="flex flex-wrap items-center gap-2">
            {totalBonus > 0 && (
              <span
                className="text-[14px] font-black uppercase tracking-[0.15em] px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2"
                style={{ background: "#0d2c54", color: "#fff" }}
              >
                <TrendingUp className="h-4 w-4" />
                + R$ {totalBonus.toFixed(2).replace(".", ",")} bônus
              </span>
            )}
            {ehCartao && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-lg"
                style={{ background: "#0d2c54", color: "#fff" }}
              >
                <CreditCard className="h-3 w-3" /> Retornar
              </span>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="flex items-stretch gap-3">
          {onRecusar && (
            <button
              type="button"
              onClick={onRecusar}
              className="h-14 px-5 text-[12px] font-black uppercase tracking-[0.18em] active:scale-[0.98] transition-transform duration-150 select-none shrink-0"
              style={{
                background: "#ffffff",
                color: BRAND.navy,
                border: `2px solid ${BRAND.navy}`,
                borderRadius: 18,
              }}
            >
              Recusar
            </button>
          )}
          <div className="flex-1 min-w-0">
            <BotaoAceitarPress onAceitar={handleAceitar} />
          </div>
        </div>

      </div>
    </div>
  );
}

export const PedidoListItem = memo(PedidoListItemBase, (prev, next) => {
  if (prev.onAceitar !== next.onAceitar) return false;
  if (prev.onRecusar !== next.onRecusar) return false;

  if (prev.taxaParaExibir !== next.taxaParaExibir) return false;
  if (prev.grupo !== next.grupo) return false;
  if ((prev.minutosAtraso ?? 0) !== (next.minutosAtraso ?? 0)) return false;
  return roundPos(prev.minhaPos) === roundPos(next.minhaPos);
});

function BotaoAceitarPress({
  onAceitar,
  label = "Aceitar Pedido",
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
      data-surface="red"
      className="relative w-full h-14 text-white text-[13px] font-black uppercase tracking-[0.22em] active:scale-[0.98] transition-transform duration-150 overflow-hidden select-none flex items-center justify-center gap-3"
      style={{
        background: BRAND.red,
        borderRadius: 18,
        boxShadow: "0 12px 28px -12px rgba(174,0,0,0.55)",
      }}
    >
      <span className="relative z-10">{progresso > 0 ? "Segure..." : label}</span>
      <ArrowRight className="h-5 w-5 relative z-10" />
      <div
        className="absolute inset-0 bg-white/20 transition-all duration-75 ease-linear"
        style={{ width: `${progresso}%` }}
      />
    </button>
  );
}
