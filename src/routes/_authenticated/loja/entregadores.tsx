import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { LojaShell } from "@/components/LojaShell";
import { AvatarImg } from "@/components/AvatarImg";
import { useMinhaLoja } from "@/hooks/use-loja";
import { supabase } from "@/integrations/supabase/client";
import { Bike, Trash2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/loja/entregadores")({
  component: EntregadoresPage,
});

function EntregadoresPage() {
  const { data: loja } = useMinhaLoja();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: vinculos, isLoading } = useQuery({
    queryKey: ["entregadores", loja?.id],
    enabled: !!loja?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("listar_entregadores_loja", {
        _loja_id: loja!.id,
      });
      if (error) throw error;
      return (data ?? []).map((v: any) => ({
        id: v.vinculo_id,
        ativo: v.ativo,
        entregador_id: v.entregador_id,
        profile: { full_name: v.full_name, phone: v.phone, avatar_url: v.avatar_url },
      }));
    },
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loja) return;
    const termo = email.trim();
    if (termo.length < 3) {
      toast.error("Informe ao menos 3 caracteres");
      return;
    }
    setAdding(true);
    const { data: encontrados, error: rpcError } = await supabase.rpc("buscar_entregador", {
      termo,
    });
    if (rpcError) {
      toast.error(rpcError.message);
      setAdding(false);
      return;
    }
    if (!encontrados || encontrados.length === 0) {
      toast.error("Entregador não encontrado", {
        description: "Peça para o entregador se cadastrar primeiro e informar telefone ou nome.",
      });
      setAdding(false);
      return;
    }
    if (encontrados.length > 1) {
      toast.error("Mais de um entregador encontrado", {
        description: "Refine a busca usando o telefone completo.",
      });
      setAdding(false);
      return;
    }
    const profile = encontrados[0];
    const { error } = await supabase
      .from("loja_entregadores")
      .insert({ loja_id: loja.id, entregador_id: profile.id });
    setAdding(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${profile.full_name ?? "Entregador"} vinculado!`);
      setEmail("");
      qc.invalidateQueries({ queryKey: ["entregadores", loja.id] });
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    await supabase.from("loja_entregadores").update({ ativo: !ativo }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["entregadores", loja?.id] });
  };

  const remove = async (id: string) => {
    await supabase.from("loja_entregadores").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["entregadores", loja?.id] });
    toast.success("Vínculo removido");
  };

  if (!loja) {
    return (
      <LojaShell title="Entregadores">
        <p className="text-muted-foreground">Crie sua loja primeiro no Dashboard.</p>
      </LojaShell>
    );
  }

  return (
    <LojaShell title="Entregadores">
      <div className="bg-card border border-border rounded-lg p-6 shadow-card mb-6">
        <h2 className="font-display text-2xl tracking-wide mb-1">Vincular entregador</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Informe o telefone ou nome de um entregador já cadastrado.
        </p>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Telefone ou nome"
            required
            className="flex-1 bg-background border border-border rounded-md px-4 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
          <button
            disabled={adding}
            className="px-6 py-3 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase tracking-wider rounded-md hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            {adding ? "..." : "Vincular"}
          </button>
        </form>
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vinculos?.map((v) => (
          <div key={v.id} className="bg-card border border-border rounded-lg p-5 shadow-card">
            <div className="flex items-center gap-3 mb-3">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center overflow-hidden ${v.ativo ? "bg-gradient-red shadow-red" : "bg-background"}`}>
                {v.profile?.avatar_url ? (
                  <AvatarImg src={v.profile.avatar_url} alt={v.profile.full_name ?? "Entregador"} className="h-full w-full object-cover" fallback={<Bike className={`h-6 w-6 ${v.ativo ? "text-primary-foreground" : "text-muted-foreground"}`} />} />
                ) : (
                  <Bike className={`h-6 w-6 ${v.ativo ? "text-primary-foreground" : "text-muted-foreground"}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{v.profile?.full_name ?? "Sem nome"}</div>
                <div className="text-xs text-muted-foreground">{v.profile?.phone ?? "—"}</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => toggleAtivo(v.id, v.ativo)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md ${v.ativo ? "bg-green-600/20 text-green-500" : "bg-zinc-600/20 text-zinc-400"}`}
              >
                {v.ativo ? "Ativo" : "Inativo"}
              </button>
              <button
                onClick={() => remove(v.id)}
                className="text-muted-foreground hover:text-destructive p-2"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {vinculos && vinculos.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-8">
            Nenhum entregador vinculado ainda.
          </p>
        )}
      </div>
    </LojaShell>
  );
}
