import { memo, useMemo } from "react";
import { AlertTriangle, Store } from "lucide-react";
import { useSomStatus } from "@/hooks/use-som-status";
import { haversineKm, type LatLng } from "@/lib/geo";
import { ATRASO_POOL_MINUTOS } from "@/lib/pedido-atraso";
import type { GrupoPedido, PedidoDisponivel } from "@/types/pedido";
import { formatCurrencyValue } from "@/lib/format";

type Props = {
  grupo: GrupoPedido;
  minhaPos: LatLng | null;
  taxaParaExibir: (p: PedidoDisponivel) => number;
  onAbrir: (grupo: GrupoPedido) => void;
  minutosAtraso?: number;
};

const BRAND = { red: "#e3000f" } as const;

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
  const { stop: pararSom } = useSomStatus();
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
      onClick={() => {
        pararSom();
        onAbrir(grupo);
      }}
      className="relative w-full mb-3 overflow-hidden text-left active:scale-[0.99] transition-transform duration-150"
      style={{
        background: "#ffffff",
        borderRadius: 18,
        border: "1px solid #e5e9ef",
        boxShadow: "0 8px 24px -16px rgba(15,27,45,0.28)",
      }}
    >
      {/* onda decorativa à direita */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2"
        style={{
          background: BRAND.red,
          width: "5px",
          opacity: 1,
        }}
      />

      <div className="relative flex items-center gap-3 px-4 py-4 pl-5">
        <div
          className="w-12 h-12 rounded-2xl grid place-items-center shrink-0"
          style={{ background: "#f0f4f8", border: "1px solid #e1e7ee" }}
        >

          {atrasado ? (
            <AlertTriangle className="h-6 w-6 text-[#e3000f]" />
          ) : (
            <Store className="h-6 w-6 text-[#0d2c54]" strokeWidth={1.8} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-black text-[#0d2c54] uppercase tracking-normal truncate leading-tight">
            {principal.loja_nome || "Loja"}
          </h3>
          <p className="text-[11px] font-bold uppercase tracking-wider mt-1 truncate text-[#718096]">
            {principal.loja_bairro || `#${principal.numero}`}
            {kmLoja && <span className="mx-1.5">·</span>}
            {kmLoja && <span>{kmLoja} KM</span>}
            {ehRota && <span className="ml-1.5">· Rota {grupo.items.length}</span>}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8a96a6]">
            Ganhos
          </p>
          <p className="text-[23px] font-black text-[#e3000f] tracking-normal tabular-nums leading-none mt-1">
            R$ {formatCurrencyValue(total)}
          </p>
        </div>
      </div>
    </button>
  );
}

export const PedidoRowCompacto = memo(PedidoRowCompactoBase);
