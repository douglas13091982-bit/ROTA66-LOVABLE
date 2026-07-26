import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, MapPin, Navigation } from "lucide-react";
import { ganhoPedidoEntregador } from "@/lib/ganho-pedido";
import { supabase } from "@/integrations/supabase/client";
import { ColetaDeadlineBadge } from "./ColetaDeadlineBadge";
import type { PedidoAtivo } from "../logic/types";


type Props = {
  pedidos: PedidoAtivo[];
  totalRota: number;
};

export function ColetaConsolidadaCard({ pedidos, totalRota }: Props) {
  const [revealed, setRevealed] = useState(false);
  const qc = useQueryClient();
  const ref = pedidos[0];
  const codigo = ref.codigo_coleta;
  const endereco = ref.endereco_coleta;
  const deadline = pedidos
    .map((p) => p.deadline_coleta_at)
    .filter((d): d is string => !!d)
    .sort()[0];
  const mapsUrl = endereco
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`
    : null;

  const total = useMemo(() => {
    const bonus = pedidos.reduce((s, p) => s + Number(p.bonus_entregador ?? 0), 0);
    const liquido = pedidos.reduce(
      (s, p) =>
        s +
        ganhoPedidoEntregador(p),
      0,
    );
    return { total: liquido + bonus, bonus };
  }, [pedidos]);

  return (
    <div className="relative p-5 md:p-6">
      <div className="relative">
        <div className="flex flex-col items-center text-center mb-4 gap-2">
          <div>
            <div className="text-sm uppercase tracking-[0.22em] text-white/50">Coleta agrupada</div>
            <div className="font-display text-2xl md:text-3xl tracking-[0.06em] mt-0.5 text-white">
              {pedidos.length} pedidos
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/50 mt-1.5">
              Rota com {totalRota} paradas no total
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
            <span className="inline-flex flex-col items-center px-4 py-2 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[9px] uppercase tracking-[0.18em] text-white/50 font-bold">
                Você recebe
              </span>
              <span className="font-display text-2xl text-white leading-none mt-0.5">
                R$ {total.total.toFixed(2).replace(".", ",")}
              </span>
              {total.bonus > 0 && (
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-amber-300 mt-1">
                  + R$ {total.bonus.toFixed(2).replace(".", ",")} bônus
                </span>
              )}
            </span>
            {deadline && <ColetaDeadlineBadge deadline={deadline} />}
          </div>
        </div>


        <div className="text-[10px] uppercase tracking-[0.22em] text-white/50 mt-2 mb-1.5">
          Endereço de coleta
        </div>
        <div className="flex items-start gap-3 mb-4">
          <div className="flex items-start gap-2 flex-1 min-w-0 text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white">
            <MapPin className="h-4 w-4 mt-0.5 text-white/70 shrink-0" />
            <span className="font-semibold">{endereco}</span>
          </div>
          {mapsUrl && (
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={mapsUrl}
              aria-label="Abrir rota no mapa"
              className="shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-[#AE0000] text-white hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
            >
              <Navigation className="h-6 w-6" />
              <span className="text-[9px] font-bold uppercase tracking-[0.16em] mt-0.5">Mapa</span>
            </a>
          )}
        </div>

        <div className="text-[11px] text-white/50 mb-4 px-1">
          Pedidos nesta coleta:{" "}
          <span className="font-bold text-white">
            {pedidos.map((p) => `#${p.numero}`).join(" · ")}
          </span>
        </div>

        {!revealed ? (
          <button
            onClick={() => {
              void (async () => {
                setRevealed(true);
                for (const p of pedidos) {
                  await supabase.rpc("entregador_chegou_coleta" as never, {
                    _pedido_id: p.id,
                  } as never);
                  const { error } = await supabase.rpc(
                    "entregador_confirmar_coleta" as never,
                    { _pedido_id: p.id } as never,
                  );
                  if (error) {
                    toast.error(error.message);
                    return;
                  }
                }
                toast.success("Coleta registrada! Siga para a entrega.");

              })();
            }}
            className="w-full px-5 py-4 bg-[#AE0000] text-white font-bold uppercase text-sm tracking-[0.18em] rounded-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"
          >
            Coletar pedidos
          </button>

        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
            <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/50 mb-2 font-bold">
              <KeyRound className="h-3.5 w-3.5" /> Confirmação de coleta
            </div>
            {[...pedidos]
              .sort((a, b) => Number(a.numero) - Number(b.numero))
              .map((p) => (
                <div
                  key={`coleta-${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-4 py-3"
                >
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-[0.18em] text-white/50 font-bold">
                      Pedido
                    </span>
                    <span className="font-display text-2xl md:text-3xl tracking-[0.06em] leading-none text-white select-all">
                      #{p.numero}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] uppercase tracking-[0.18em] text-white/50 font-bold">
                      Coleta
                    </span>
                    <span className="font-display text-3xl md:text-4xl tracking-[0.3em] text-[#AE0000] select-all leading-none">
                      {p.codigo_coleta ?? codigo}
                    </span>
                  </div>
                </div>
              ))}
            <p className="text-[11px] text-white/50 text-center pt-1">
              Mostre estes códigos para a loja confirmar os {pedidos.length} pedidos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
