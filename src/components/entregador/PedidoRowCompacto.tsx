import { memo, useMemo } from "react";
import { AlertTriangle, Store } from "lucide-react";
import { haversineKm, type LatLng } from "@/lib/geo";
import { ATRASO_POOL_MINUTOS } from "@/lib/pedido-atraso";
import type { GrupoPedido, PedidoDisponivel } from "@/types/pedido";

type Props = {
  grupo: GrupoPedido;
  minhaPos: LatLng | null;
  taxaParaExibir: (p: PedidoDisponivel) => number;
  onAbrir: (grupo: GrupoPedido) => void;
  minutosAtraso?: number;
};

const BRAND = { red: "#AE0000", redDeep: "#8F0000" } as const;

function kmAteLoja(p: PedidoDisponivel, minhaPos: LatLng | null): string | null {
  if (!minhaPos || p.endereco_coleta_lat == null || p.endereco_coleta_lng == null) return null;
  return haversineKm(
    minhaPos.lat,
    minhaPos.lng,
    Number(p.endereco_coleta_lat),
    Number(p.endereco_coleta_lng),
  ).toFixed(1);
}

function PedidoRowCompactoBase({
  grupo,
  minhaPos,
  taxaParaExibir,
  onAbrir,
  minutosAtraso = 0,
}: Props) {
  const principal = grupo.items[0];
  const atrasado = minutosAtraso >= ATRASO_POOL_MINUTOS;
  const total = useMemo(
    () =>
      grupo.items.reduce(
        (s, p) => s + taxaParaExibir(p) + Number(p.bonus_entregador ?? 0),
        0,
      ),
    [grupo.items, taxaParaExibir],
  );
  const kmLoja = kmAteLoja(principal, minhaPos);
  const ehRota = grupo.items.length > 1;

  return (
    <button
      type="button"
      onClick={() => onAbrir(grupo)}
      data-surface="red"
      className="relative w-full mb-3 overflow-hidden text-left active:scale-[0.99] transition-transform duration-150"
      style={{
        background: BRAND.red,
        borderRadius: 18,
        boxShadow: "0 10px 24px -14px rgba(174,0,0,0.55)",
      }}
    >
      {/* onda decorativa à direita */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2"
        style={{
          background: `radial-gradient(120% 140% at 100% 50%, ${BRAND.redDeep} 0%, rgba(143,0,0,0.55) 45%, rgba(143,0,0,0) 70%)`,
        }}
      />

      <div className="relative flex items-center gap-3 px-4 py-4">
        <div
          className="w-12 h-12 rounded-2xl grid place-items-center shrink-0"
          style={{ background: "#0d2c54", border: "1px solid rgba(255,255,255,0.25)" }}
        >

          {atrasado ? (
            <AlertTriangle className="h-6 w-6 !text-yellow-400" />
          ) : (
            <Store className="h-6 w-6 !text-white" strokeWidth={1.8} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-black !text-white uppercase tracking-tight truncate leading-tight">
            {principal.loja_nome || "Loja"}
          </h3>
          <p className="text-sm font-semibold uppercase tracking-wide mt-1 truncate !text-white/75">
            {principal.loja_bairro || `#${principal.numero}`}
            {kmLoja && <span className="mx-1.5">·</span>}
            {kmLoja && <span>{kmLoja} KM</span>}
            {ehRota && <span className="ml-1.5">· Rota {grupo.items.length}</span>}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[11px] font-bold uppercase tracking-normal !text-white/75">
            Ganhos
          </p>
          <p className="text-[28px] font-black !text-white tracking-tight tabular-nums leading-none mt-1">
            R$ {total.toFixed(2).replace(".", ",")}
          </p>
        </div>
      </div>
    </button>
  );
}

export const PedidoRowCompacto = memo(PedidoRowCompactoBase);
