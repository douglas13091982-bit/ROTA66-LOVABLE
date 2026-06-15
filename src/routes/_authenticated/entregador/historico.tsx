import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { EntregadorShell } from "@/components/EntregadorShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTaxaSistema, liquidoEntregador } from "@/hooks/use-taxa-sistema";
import { History } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Periodo = "semanal" | "mensal";

const chartTextColor = "var(--muted-foreground)";
const chartGridColor = "var(--border)";
const chartTooltipBg = "color-mix(in oklch, var(--card) 96%, transparent)";
const chartHoverFill = "color-mix(in oklch, var(--muted-foreground) 8%, transparent)";

export const Route = createFileRoute("/_authenticated/entregador/historico")({
  component: HistoricoPage,
});

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function HistoricoPage() {
  const { user } = useAuth();
  const taxaSistema = useTaxaSistema();
  const [periodo, setPeriodo] = useState<Periodo>("semanal");

  // Janela: 6 meses cobre as duas visões (semanal=7 dias, mensal=6 meses).
  const inicioJanela = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["pedidos-historico", user?.id, inicioJanela.toISOString()],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*, lojas(nome)")
        .eq("entregador_id", user!.id)
        .eq("status", "entregue")
        .gte("updated_at", inicioJanela.toISOString())
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Buckets e agregados
  const { chartData, totalPeriodo, totalEntregas, listagem } = useMemo(() => {
    const all = pedidos ?? [];

    if (periodo === "semanal") {
      // Últimos 7 dias (incluindo hoje)
      const hoje = startOfDay(new Date());
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 6);

      const buckets: { key: string; label: string; valor: number; ts: number }[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(inicio);
        d.setDate(inicio.getDate() + i);
        buckets.push({
          key: d.toISOString().slice(0, 10),
          label: d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }),
          valor: 0,
          ts: d.getTime(),
        });
      }

      const dentro = all.filter(
        (p) => new Date(p.updated_at).getTime() >= inicio.getTime()
      );
      for (const p of dentro) {
        const k = new Date(p.updated_at).toISOString().slice(0, 10);
        const b = buckets.find((x) => x.key === k);
        if (b) b.valor += liquidoEntregador(p.taxa_entrega, taxaSistema);
      }

      const total = dentro.reduce(
        (s, p) => s + liquidoEntregador(p.taxa_entrega, taxaSistema),
        0
      );
      return {
        chartData: buckets,
        totalPeriodo: total,
        totalEntregas: dentro.length,
        listagem: dentro,
      };
    }

    // Mensal: últimos 6 meses (incluindo o atual)
    const hojeM = new Date();
    const inicioMes = new Date(hojeM.getFullYear(), hojeM.getMonth() - 5, 1);

    const buckets: { key: string; label: string; valor: number; ts: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(inicioMes.getFullYear(), inicioMes.getMonth() + i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        valor: 0,
        ts: d.getTime(),
      });
    }

    const dentro = all.filter(
      (p) => new Date(p.updated_at).getTime() >= inicioMes.getTime()
    );
    for (const p of dentro) {
      const d = new Date(p.updated_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const b = buckets.find((x) => x.key === k);
      if (b) b.valor += liquidoEntregador(p.taxa_entrega, taxaSistema);
    }

    const total = dentro.reduce(
      (s, p) => s + liquidoEntregador(p.taxa_entrega, taxaSistema),
      0
    );
    return {
      chartData: buckets,
      totalPeriodo: total,
      totalEntregas: dentro.length,
      listagem: dentro,
    };
  }, [pedidos, periodo, taxaSistema]);

  return (
    <EntregadorShell title="Histórico">
      {/* Override gradiente do shell apenas nesta página */}
      <style>{`.panel-premium { background: #0f304d !important; }`}</style>
      {/* Toggle de período */}
      <div className="flex gap-2 mb-5 p-1.5">
        {(["semanal", "mensal"] as Periodo[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-[0.18em] transition-all duration-300 ease-premium ${
              periodo === p
                ? "bg-gradient-red text-primary-foreground shadow-red"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p === "semanal" ? "Semanal" : "Mensal"}
          </button>
        ))}
      </div>

      {/* Resumo */}
      <div className="p-6 mb-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            {periodo === "semanal" ? "Últimos 7 dias" : "Últimos 6 meses"}
          </div>
          <div className="font-display text-4xl md:text-5xl text-emerald-400 leading-none whitespace-nowrap">
            R$ {totalPeriodo.toFixed(2)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">Entregas</div>
          <div className="font-display text-4xl md:text-5xl leading-none">{totalEntregas}</div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="p-5 mb-6">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
          Ganhos por {periodo === "semanal" ? "dia" : "mês"}
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="barGanho" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.18 155)" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="oklch(0.55 0.16 155)" stopOpacity={0.65} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} opacity={0.4} />
              <XAxis
                dataKey="label"
                stroke={chartTextColor}
                tick={{ fontSize: 11, fill: chartTextColor }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={chartTextColor}
                tick={{ fontSize: 11, fill: chartTextColor }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `R$${Math.round(v)}`}
              />
              <Tooltip
                cursor={{ fill: chartHoverFill }}
                wrapperStyle={{ outline: "none" }}
                contentStyle={{
                  background: chartTooltipBg,
                  border: `1px solid ${chartGridColor}`,
                  borderRadius: 12,
                  fontSize: 12,
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 10px 30px -10px oklch(0 0 0 / 0.3)",
                  color: chartTextColor,
                }}
                itemStyle={{ color: chartTextColor }}
                formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "Ganho"]}
                labelStyle={{ color: chartTextColor }}
              />

              <Bar dataKey="valor" fill="url(#barGanho)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}
      {!isLoading && listagem.length === 0 && (
        <div className="p-12 text-center">
          <History className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="font-display text-2xl tracking-[0.06em]">
            Sem entregas {periodo === "semanal" ? "nesta semana" : "neste período"}
          </p>
        </div>
      )}

      {listagem.length > 0 && (
        <div className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">
              Entregas concluídas
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {listagem.length} {listagem.length === 1 ? "registro" : "registros"}
            </span>
          </div>
          {(() => {
            const hoje = startOfDay(new Date());
            const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1);
            const groupLabel = (d: Date) => {
              const dd = startOfDay(d).getTime();
              if (dd === hoje.getTime()) return "HOJE";
              if (dd === ontem.getTime()) return "ONTEM";
              return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" }).toUpperCase();
            };
            const groups: { label: string; items: typeof listagem }[] = [];
            for (const p of listagem) {
              const lab = groupLabel(new Date(p.updated_at));
              const last = groups[groups.length - 1];
              if (last && last.label === lab) last.items.push(p);
              else groups.push({ label: lab, items: [p] });
            }
            return groups.map((g) => (
              <div key={g.label}>
                <div className="px-4 pt-4 pb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">
                  {g.label}
                </div>
                {g.items.map((p) => {
                  const valor = liquidoEntregador(p.taxa_entrega, taxaSistema);
                  const hora = new Date(p.updated_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                  const lojaNome = (p as any).lojas?.nome ?? p.cliente_nome ?? "Loja";
                  return (
                    <div
                      key={p.id}
                      className="group flex items-start justify-between gap-3 px-4 py-3 border-b border-border/30 last:border-b-0 transition-colors duration-200 hover:bg-white/[0.02]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-foreground truncate">
                          {lojaNome} <span className="text-foreground">#{p.numero}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-muted-foreground">{hora}</span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400">
                            Concluído
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-lg text-white whitespace-nowrap">
                          R$ {valor.toFixed(2).replace(".", ",")}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Taxa de entrega</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ));
          })()}
        </div>
      )}
    </EntregadorShell>
  );
}
