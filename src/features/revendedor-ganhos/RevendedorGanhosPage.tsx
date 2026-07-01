import { RevendedorShell } from "@/components/RevendedorShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Wallet } from "lucide-react";

type Row = {
  id: string;
  competencia: string;
  loja_nome: string;
  valor_total: number;
  taxa_admin: number;
  valor_liquido: number;
  pago: boolean;
  pago_em: string | null;
};

export function RevendedorGanhosPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    enabled: !!user?.id,
    queryKey: ["revendedor-ganhos", user?.id],
    queryFn: async () => {
      const { data: rev, error: revErr } = await (supabase as any)
        .from("revendedores")
        .select("percentual_receita")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (revErr) throw revErr;
      const percentualAdm = Number(rev?.percentual_receita ?? 0);

      const { data: lojas, error: lErr } = await (supabase as any)
        .from("lojas")
        .select("id, nome")
        .eq("revendedor_id", user!.id);
      if (lErr) throw lErr;
      const lojasList = (lojas ?? []) as { id: string; nome: string }[];
      if (lojasList.length === 0) return { percentualAdm, rows: [] as Row[] };

      const nomeMap = new Map(lojasList.map((l) => [l.id, l.nome]));
      const { data: mens, error: mErr } = await (supabase as any)
        .from("mensalidades_loja")
        .select("id, loja_id, competencia, valor, valor_total, pago, pago_em")
        .in("loja_id", lojasList.map((l) => l.id))
        .order("competencia", { ascending: false });
      if (mErr) throw mErr;

      const rows: Row[] = (mens ?? []).map((m: any) => {
        const total = Number(m.valor_total ?? m.valor ?? 0);
        const taxa = +(total * (percentualAdm / 100)).toFixed(2);
        return {
          id: m.id,
          competencia: m.competencia,
          loja_nome: nomeMap.get(m.loja_id) ?? "—",
          valor_total: total,
          taxa_admin: taxa,
          valor_liquido: +(total - taxa).toFixed(2),
          pago: !!m.pago,
          pago_em: m.pago_em,
        };
      });
      return { percentualAdm, rows };
    },
  });

  const rows = data?.rows ?? [];
  const percentualAdm = data?.percentualAdm ?? 0;
  const totalBruto = rows.filter((r) => r.pago).reduce((s, r) => s + r.valor_total, 0);
  const totalLiquido = rows.filter((r) => r.pago).reduce((s, r) => s + r.valor_liquido, 0);
  const totalTaxa = rows.filter((r) => r.pago).reduce((s, r) => s + r.taxa_admin, 0);

  return (
    <RevendedorShell title="Ganhos">
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold text-white mb-2">Meus ganhos</h1>
        <p className="text-white/60 text-sm mb-6">
          Comissão sobre os planos das lojas que você indicou. Taxa da plataforma:{" "}
          <span className="text-white font-semibold">{percentualAdm}%</span>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="pp-card rounded-2xl p-5">
            <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
              <Wallet className="h-4 w-4" /> Total bruto (pago)
            </div>
            <div className="text-white text-xl font-bold">R$ {totalBruto.toFixed(2)}</div>
          </div>
          <div className="pp-card rounded-2xl p-5">
            <div className="text-white/50 text-xs mb-1">Taxa plataforma ({percentualAdm}%)</div>
            <div className="text-white text-xl font-bold">R$ {totalTaxa.toFixed(2)}</div>
          </div>
          <div className="pp-card rounded-2xl p-5">
            <div className="flex items-center gap-2 text-xs mb-1" style={{ color: "var(--rota-gold)" }}>
              <TrendingUp className="h-4 w-4" /> Líquido para você
            </div>
            <div className="text-xl font-bold" style={{ color: "var(--rota-gold)" }}>
              R$ {totalLiquido.toFixed(2)}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-white/50 text-sm">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="pp-card rounded-2xl p-8 text-center">
            <TrendingUp className="h-10 w-10 mx-auto text-white/40 mb-3" />
            <div className="text-white font-semibold mb-1">Nenhum ganho ainda</div>
            <div className="text-sm text-white/60">
              Assim que suas lojas pagarem uma mensalidade, os valores aparecem aqui.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const comp = new Date(r.competencia + "T00:00:00");
              const label = comp.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
              return (
                <div key={r.id} className="pp-card rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                    <div>
                      <div className="text-white font-semibold">{r.loja_nome}</div>
                      <div className="text-xs text-white/50 capitalize">{label}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                        r.pago ? "bg-green-600/20 text-green-400" : "bg-yellow-600/20 text-yellow-400"
                      }`}
                    >
                      {r.pago ? "Pago" : "Em aberto"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-white/50">Valor do plano</div>
                      <div className="text-white font-semibold">R$ {r.valor_total.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/50">Taxa ({percentualAdm}%)</div>
                      <div className="text-white/80 font-semibold">- R$ {r.taxa_admin.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/50">Líquido</div>
                      <div className="font-bold" style={{ color: "var(--rota-gold)" }}>
                        R$ {r.valor_liquido.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </RevendedorShell>
  );
}
