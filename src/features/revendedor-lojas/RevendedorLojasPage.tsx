import { RevendedorShell } from "@/components/RevendedorShell";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Store, MapPin, Phone } from "lucide-react";

type Loja = {
  id: string;
  nome: string;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  ativa: boolean;
  status: string;
  plano_mensal_ativo: boolean;
  mensalidade_valor: number | null;
};

export function RevendedorLojasPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["revendedor-lojas"],
    queryFn: async (): Promise<Loja[]> => {
      const { data, error } = await supabase
        .from("lojas")
        .select("id,nome,telefone,cidade,estado,endereco,ativa,status,plano_mensal_ativo,mensalidade_valor")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as Loja[];
    },
  });

  return (
    <RevendedorShell title="Minhas Lojas">
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold text-white mb-2">Minhas Lojas</h1>
        <p className="text-white/60 text-sm mb-6">Lojas atribuídas a você pelo super admin.</p>

        {isLoading ? (
          <div className="text-white/50 text-sm">Carregando…</div>
        ) : !data || data.length === 0 ? (
          <div className="pp-card rounded-2xl p-8 text-center">
            <Store className="h-10 w-10 mx-auto text-white/40 mb-3" />
            <div className="text-white font-semibold mb-1">Nenhuma loja atribuída</div>
            <div className="text-sm text-white/60">Peça ao super admin para vincular lojas ao seu perfil.</div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {data.map((l) => (
              <div key={l.id} className="pp-card rounded-2xl p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-white font-semibold truncate">{l.nome}</div>
                    <div className="text-xs text-white/50">{l.status}</div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${l.ativa ? "bg-green-600/20 text-green-400" : "bg-zinc-600/20 text-zinc-400"}`}>
                    {l.ativa ? "Ativa" : "Inativa"}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5 text-sm text-white/70">
                  {l.endereco && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-white/40" />
                      <span className="truncate">{l.endereco}, {l.cidade}/{l.estado}</span>
                    </div>
                  )}
                  {l.telefone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-white/40" />
                      <span>{l.telefone}</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-white/5 text-xs text-white/60">
                  Plano mensal: <span className="text-white font-semibold">
                    {l.plano_mensal_ativo ? `R$ ${Number(l.mensalidade_valor ?? 0).toFixed(2)}` : "Sem plano"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </RevendedorShell>
  );
}
