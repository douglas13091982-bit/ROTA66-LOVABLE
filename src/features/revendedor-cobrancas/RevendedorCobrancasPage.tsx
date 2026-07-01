import { RevendedorShell } from "@/components/RevendedorShell";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";

type Cobranca = {
  id: string;
  competencia: string;
  valor_mensalidade: number;
  valor_percentual: number;
  valor_total: number;
  receita_base: number;
  vencimento: string;
  pago: boolean;
  pago_em: string | null;
  mp_ticket_url: string | null;
};

export function RevendedorCobrancasPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["revendedor-cobrancas"],
    queryFn: async (): Promise<Cobranca[]> => {
      const { data, error } = await (supabase as any)
        .from("revendedor_cobrancas")
        .select("*")
        .order("competencia", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Cobranca[];
    },
  });

  return (
    <RevendedorShell title="Cobranças">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-white mb-2">Minhas cobranças</h1>
        <p className="text-white/60 text-sm mb-6">Mensalidade fixa + % sobre a receita das suas lojas.</p>

        {isLoading ? (
          <div className="text-white/50 text-sm">Carregando…</div>
        ) : !data || data.length === 0 ? (
          <div className="pp-card rounded-2xl p-8 text-center">
            <Wallet className="h-10 w-10 mx-auto text-white/40 mb-3" />
            <div className="text-white font-semibold mb-1">Nenhuma cobrança gerada</div>
            <div className="text-sm text-white/60">As cobranças são geradas automaticamente no dia 1º de cada mês.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((c) => {
              const comp = new Date(c.competencia + "T00:00:00");
              const label = comp.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
              return (
                <div key={c.id} className="pp-card rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-white font-semibold capitalize">{label}</div>
                      <div className="text-xs text-white/50">
                        Vence em {new Date(c.vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${c.pago ? "bg-green-600/20 text-green-400" : "bg-yellow-600/20 text-yellow-400"}`}>
                      {c.pago ? "Pago" : "Em aberto"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
                    <div>
                      <div className="text-xs text-white/50">Mensalidade</div>
                      <div className="text-white font-semibold">R$ {Number(c.valor_mensalidade).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/50">% s/ receita (R$ {Number(c.receita_base).toFixed(2)})</div>
                      <div className="text-white font-semibold">R$ {Number(c.valor_percentual).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/50">Total</div>
                      <div className="text-white font-bold" style={{ color: "var(--rota-gold)" }}>R$ {Number(c.valor_total).toFixed(2)}</div>
                    </div>
                  </div>
                  {!c.pago && c.mp_ticket_url && (
                    <a href={c.mp_ticket_url} target="_blank" rel="noreferrer" className="mt-3 inline-block px-3 py-1.5 rounded-lg text-sm font-semibold text-black" style={{ background: "var(--rota-gold)" }}>
                      Pagar via PIX
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </RevendedorShell>
  );
}
