import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useFranquia } from "@/hooks/use-franquia";
import { formatCurrency } from "@/lib/format";
import { MapPin, AlertTriangle } from "lucide-react";
import { ColaboradoresSection } from "./components/ColaboradoresSection";

type Fatura = {
  id: string;
  competencia: string;
  valor: number;
  vencimento: string;
  status: string;
  mp_link: string | null;
  pago_em: string | null;
};

export function MinhaFranquiaPage() {
  const { isFranqueado, cidade, config, loading } = useFranquia();

  const { data: faturas } = useQuery({
    queryKey: ["minha-franquia-faturas"],
    enabled: isFranqueado,
    queryFn: async (): Promise<Fatura[]> => {
      const { data, error } = await (supabase as any)
        .from("franqueados_faturas")
        .select("*")
        .order("vencimento", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Fatura[];
    },
  });

  if (loading) return <AdminShell title="Minha franquia"><div className="text-white/50 text-sm">Carregando…</div></AdminShell>;

  if (!isFranqueado) {
    return (
      <AdminShell title="Minha franquia">
        <div className="max-w-md mx-auto mt-12 text-center pp-card rounded-2xl p-8">
          <div className="text-lg font-semibold text-white mb-1">Você é o owner</div>
          <div className="text-sm text-white/60">Esta página é para franqueados de cidade. Você não paga mensalidade.</div>
        </div>
      </AdminShell>
    );
  }

  const pendentes = (faturas ?? []).filter((f) => f.status !== "pago" && f.status !== "cancelado");

  return (
    <AdminShell title="Minha franquia">
      <div className="max-w-3xl space-y-6">
        {config?.bloqueado_por_inadimplencia && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold text-red-300">Acesso bloqueado por inadimplência</div>
              <div className="text-sm text-red-200/80">Regularize as faturas pendentes abaixo para reativar seu acesso.</div>
            </div>
          </div>
        )}

        <section className="pp-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-white/80" />
            <h2 className="text-lg font-semibold text-white">Sua cidade</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><div className="text-white/50 text-xs">Cidade</div><div className="text-white font-semibold">{cidade}</div></div>
            <div><div className="text-white/50 text-xs">Mensalidade</div><div className="text-white font-semibold">{formatCurrency(config?.mensalidade_valor ?? 0)}</div></div>
            <div><div className="text-white/50 text-xs">Dia venc.</div><div className="text-white font-semibold">{config?.dia_vencimento}</div></div>
            <div><div className="text-white/50 text-xs">Faturas em aberto</div><div className="text-white font-semibold">{pendentes.length}</div></div>
          </div>
        </section>

        <section className="pp-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Faturas</h2>
          {!faturas?.length ? (
            <div className="text-white/50 text-sm">Nenhuma fatura gerada ainda.</div>
          ) : (
            <div className="space-y-2">
              {faturas.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm p-3 rounded-lg border border-white/10 bg-white/[0.02]">
                  <div>
                    <div className="text-white font-medium">{f.competencia}</div>
                    <div className="text-xs text-white/60">Vence {f.vencimento}</div>
                  </div>
                  <div className="text-white/80">{formatCurrency(f.valor)}</div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                    f.status === "pago" ? "bg-green-600/20 text-green-400" :
                    f.status === "vencido" ? "bg-red-600/20 text-red-400" :
                    "bg-yellow-600/20 text-yellow-400"
                  }`}>{f.status}</span>
                  {f.mp_link && f.status !== "pago" ? (
                    <a href={f.mp_link} target="_blank" rel="noreferrer" className="text-xs px-3 py-1.5 rounded-lg font-semibold text-black" style={{ background: "var(--rota-gold)" }}>Pagar</a>
                  ) : <span />}
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 text-xs text-white/50">
            Fale com o owner para gerar o link de pagamento se ainda não estiver disponível.
          </div>
        </section>

        <ColaboradoresSection />
      </div>
    </AdminShell>
  );
}
