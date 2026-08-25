import { useEffect, useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeLazy } from "@/lib/realtime-lazy";
import { formatCurrencyValue, formatDayMonth } from "@/lib/format";

type Props = {
  lojaId: string;
  taxaPorPedido: number;
  planoMensalAtivo: boolean;
};

function inicioSemana(d = new Date()) {
  // Segunda-feira 00:00 da semana corrente
  const dt = new Date(d);
  const dow = (dt.getDay() + 6) % 7; // 0 = segunda
  dt.setDate(dt.getDate() - dow);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function proximaSegunda(d = new Date()) {
  const dt = inicioSemana(d);
  dt.setDate(dt.getDate() + 7);
  return dt;
}

export function PreviaSemanaCard({ lojaId, taxaPorPedido, planoMensalAtivo }: Props) {
  const [qtd, setQtd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    setLoading(true);
    const ini = inicioSemana();
    const fim = proximaSegunda();
    const { count } = await supabase
      .from("pedidos")
      .select("id", { count: "exact", head: true })
      .eq("loja_id", lojaId)
      .eq("status", "entregue")
      .gte("entrega_confirmada_em", ini.toISOString())
      .lt("entrega_confirmada_em", fim.toISOString());
    setQtd(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    if (!lojaId) return;
    carregar();
    return subscribeLazy(() =>
      supabase
        .channel(`previa-semana-${lojaId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "pedidos", filter: `loja_id=eq.${lojaId}` },
          () => carregar(),
        )
        .subscribe()
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaId]);

  if (planoMensalAtivo) return null;
  if (!taxaPorPedido || taxaPorPedido <= 0) return null;

  const total = (qtd ?? 0) * taxaPorPedido;
  const segunda = proximaSegunda();
  const segundaFmt = formatDayMonth(segunda);
  const ini = inicioSemana();
  const periodo = `${formatDayMonth(ini)} – ${formatDayMonth(segunda.getTime() - 86400000)}`;

  return (
    <div className="bg-gradient-to-br from-primary/10 to-card border border-primary/30 rounded-lg p-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/15 text-primary">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg">Prévia desta semana</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Período {periodo} · cobrança gerada em {segundaFmt}
          </p>

          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-3" />
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Pedidos entregues
                </div>
                <div className="text-2xl font-bold">{qtd}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Taxa por pedido
                </div>
                <div className="text-2xl font-bold">
                  R$ {formatCurrencyValue(taxaPorPedido)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Total previsto
                </div>
                <div className="text-2xl font-bold text-primary">
                  R$ {formatCurrencyValue(total)}
                </div>
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground mt-3">
            Valor estimado em tempo real. A cobrança consolidada é gerada
            automaticamente toda segunda-feira e aparece na lista "Taxas por pedido" abaixo.
          </p>
        </div>
      </div>
    </div>
  );
}
