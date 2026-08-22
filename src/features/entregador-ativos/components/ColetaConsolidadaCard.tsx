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
  onSairDoLocal?: () => void;
  onColetar?: () => void;
};

export function ColetaConsolidadaCard({ pedidos, totalRota, onSairDoLocal, onColetar }: Props) {


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
    <div className="relative p-5 md:p-6 bg-white border border-border/40 rounded-[22px] shadow-soft overflow-hidden">
      <div className="relative">
        <div className="flex flex-col items-center text-center mb-4 gap-2">
          <div>
            <div className="text-base uppercase tracking-wider text-muted-foreground font-black">Coleta agrupada</div>
            <div className="font-display text-4xl md:text-5xl tracking-[0.06em] mt-1 text-navy font-black">
              {pedidos.length} pedidos
            </div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mt-2 font-bold">
              Rota com {totalRota} paradas no total
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
            <span className="inline-flex flex-col items-center px-4 py-2 rounded-xl bg-gray-50 border border-border/40">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-black">
                Você recebe
              </span>
              <span className="font-display text-4xl text-navy leading-none mt-1 font-black">
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


        <div className="text-[13px] uppercase tracking-wider text-muted-foreground mt-4 mb-2 font-black">
          Endereço de coleta
        </div>
        <div className="flex items-start gap-3 mb-4">
          <div className="flex items-start gap-2 flex-1 min-w-0 text-lg bg-gray-50 border border-border/40 rounded-lg px-4 py-3 text-navy">
            <MapPin className="h-4 w-4 mt-0.5 text-[#e3000f] shrink-0" />
            <span className="font-bold">{endereco}</span>
          </div>
          {mapsUrl && (
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={mapsUrl}
              onClick={() => {
                if (revealed) {
                  qc.invalidateQueries({ queryKey: ["pedidos-ativos"] });
                }
              }}
              aria-label="Abrir rota no mapa"
              className="shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-xl bg-[#e3000f] text-white hover:-translate-y-0.5 active:scale-95 transition-all duration-300"
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
                onColetar?.();

                for (const p of pedidos) {
                  await supabase.rpc("entregador_chegou_coleta" as never, {
                    _pedido_id: p.id,
                  } as never);
                  await supabase.rpc(
                    "entregador_confirmar_coleta" as never,
                    { _pedido_id: p.id } as never,
                  );
                }
                toast.success("Coleta registrada! Siga para a entrega.");


              })();
            }}
            className="w-full px-5 py-4 bg-[#e3000f] text-white font-bold uppercase text-sm tracking-[0.18em] rounded-xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"
          >
            Coletar pedidos
          </button>

        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
            <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.22em] text-white/60 mb-3 font-black">
              <KeyRound className="h-4 w-4" /> Confirmação de coleta
            </div>
            {[...pedidos]
              .sort((a, b) => Number(a.numero) - Number(b.numero))
              .map((p) => (
                <div
                  key={`coleta-${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-4 py-3"
                >
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-[0.18em] text-white/50 font-black">
                      Pedido
                    </span>
                    <span className="font-display text-2xl md:text-3xl tracking-[0.06em] leading-none text-white select-all font-black">
                      #{p.numero}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs uppercase tracking-[0.18em] text-white/50 font-black">
                      Coleta
                    </span>
                    <span className="font-display text-3xl md:text-4xl tracking-normal text-[#e3000f] select-all leading-none font-black">
                      {p.codigo_coleta ?? codigo}
                    </span>
                  </div>
                </div>
              ))}
            <p className="text-[11px] text-white/50 text-center pt-1">
              Mostre estes códigos para a loja confirmar os {pedidos.length} pedidos.
            </p>
            {onSairDoLocal && (
              <button
                onClick={onSairDoLocal}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-bold uppercase text-[14px] tracking-[0.16em] text-white transition-all active:scale-[0.98] mt-4"
                style={{
                  background: "#e3000f",
                }}
              >
                <span>Sair do local</span>
                <Navigation className="h-5 w-5 rotate-90" />
              </button>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
