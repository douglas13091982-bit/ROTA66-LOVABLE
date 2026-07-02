import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, Users } from "lucide-react";
import { criarRevendedor, excluirRevendedor } from "@/lib/revendedores.functions";


type Revendedor = {
  user_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  documento: string | null;
  mensalidade_valor: number;
  percentual_receita: number;
  dia_vencimento: number;
  ativo: boolean;
};

const QK = ["admin-revendedores"];

export function AdminRevendedoresPage() {
  const qc = useQueryClient();
  const criar = useServerFn(criarRevendedor);
  const excluir = useServerFn(excluirRevendedor);

  const { data: revs, isLoading } = useQuery({
    queryKey: QK,
    queryFn: async (): Promise<Revendedor[]> => {
      const { data, error } = await (supabase as any)
        .from("revendedores")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Revendedor[];
    },
  });

  const { data: lojasVinculadas } = useQuery({
    queryKey: ["admin-revendedores-lojas"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lojas")
        .select("id, nome, cidade, ativa, revendedor_id")
        .not("revendedor_id", "is", null);
      if (error) throw error;
      const map: Record<string, Array<{ id: string; nome: string; cidade: string | null; ativa: boolean }>> = {};
      for (const l of (data ?? []) as any[]) {
        (map[l.revendedor_id] ??= []).push({ id: l.id, nome: l.nome, cidade: l.cidade, ativa: l.ativa });
      }
      return map;
    },
  });


  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    telefone: "",
    documento: "",
    mensalidade_valor: "0",
    percentual_receita: "10",
    dia_vencimento: "5",
  });

  const createMut = useMutation({
    mutationFn: async () => {
      await criar({
        data: {
          email: form.email,
          senha: form.senha,
          nome: form.nome,
          telefone: form.telefone || undefined,
          documento: form.documento || undefined,
          mensalidade_valor: Number(form.mensalidade_valor) || 0,
          percentual_receita: Number(form.percentual_receita) || 0,
          dia_vencimento: Math.min(28, Math.max(1, Number(form.dia_vencimento) || 5)),
        },
      });
    },
    onSuccess: () => {
      toast.success("Revendedor criado");
      setForm({ nome: "", email: "", senha: "", telefone: "", documento: "", mensalidade_valor: "0", percentual_receita: "10", dia_vencimento: "5" });
      qc.invalidateQueries({ queryKey: QK });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar"),
  });

  const updateMut = useMutation({
    mutationFn: async (r: Partial<Revendedor> & { user_id: string }) => {
      const { user_id, ...patch } = r;
      const { error } = await (supabase as any).from("revendedores").update(patch).eq("user_id", user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atualizado");
      qc.invalidateQueries({ queryKey: QK });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const delMut = useMutation({
    mutationFn: async (user_id: string) => {
      await excluir({ data: { user_id } });
    },
    onSuccess: () => {
      toast.success("Excluído");
      qc.invalidateQueries({ queryKey: QK });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  return (
    <AdminShell title="Revendedores">
      <div className="max-w-5xl space-y-8">
        <section className="pp-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5 text-white/80" />
            <h2 className="text-lg font-semibold text-white">Novo revendedor</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30" placeholder="Nome completo" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            <input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30" placeholder="Senha inicial" type="text" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
            <input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30" placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            <input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30" placeholder="CPF/CNPJ" value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
            <div className="grid grid-cols-2 gap-2 sm:col-span-2">
              <label className="text-xs text-white/70 flex flex-col gap-1">
                % comissão do revendedor
                <input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30" value={form.percentual_receita} onChange={(e) => setForm({ ...form, percentual_receita: e.target.value })} />
              </label>
              <label className="text-xs text-white/70 flex flex-col gap-1">
                Dia vencimento
                <input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30" value={form.dia_vencimento} onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })} />
              </label>
            </div>
          </div>
          <button
            className="mt-4 px-4 py-2 rounded-lg font-semibold text-black"
            style={{ background: "var(--rota-gold)" }}
            disabled={createMut.isPending || !form.nome || !form.email || !form.senha}
            onClick={() => createMut.mutate()}
          >
            {createMut.isPending ? "Criando..." : "Criar revendedor"}
          </button>
        </section>

        <section className="pp-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-white/80" />
            <h2 className="text-lg font-semibold text-white">Revendedores cadastrados</h2>
          </div>
          {isLoading ? (
            <div className="text-white/50 text-sm">Carregando…</div>
          ) : !revs || revs.length === 0 ? (
            <div className="text-white/50 text-sm">Nenhum revendedor cadastrado.</div>
          ) : (
            <div className="space-y-2">
              {revs.map((r) => (
                <div key={r.user_id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div>
                      <div className="text-white font-semibold">{r.nome}</div>
                      <div className="text-xs text-white/60">{r.email}{r.telefone ? ` · ${r.telefone}` : ""}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateMut.mutate({ user_id: r.user_id, ativo: !r.ativo })}
                        className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded ${r.ativo ? "bg-green-600/20 text-green-400" : "bg-zinc-600/20 text-zinc-400"}`}
                      >
                        {r.ativo ? "Ativo" : "Inativo"}
                      </button>
                      <button
                        onClick={() => confirm(`Excluir ${r.nome}? Esta ação remove o acesso.`) && delMut.mutate(r.user_id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <label className="text-[11px] text-white/60 flex flex-col gap-1">
                      % comissão revend.
                      <input
                        defaultValue={r.percentual_receita}
                        className="w-full px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30"
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== r.percentual_receita) updateMut.mutate({ user_id: r.user_id, percentual_receita: v });
                        }}
                      />
                    </label>
                    <label className="text-[11px] text-white/60 flex flex-col gap-1">
                      Dia venc.
                      <input
                        defaultValue={r.dia_vencimento}
                        className="w-full px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30"
                        onBlur={(e) => {
                          const v = Math.min(28, Math.max(1, Number(e.target.value) || 5));
                          if (v !== r.dia_vencimento) updateMut.mutate({ user_id: r.user_id, dia_vencimento: v });
                        }}
                      />
                    </label>
                  </div>
                  {(() => {
                    const lojas = lojasVinculadas?.[r.user_id] ?? [];
                    return (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="text-[11px] uppercase tracking-wide text-white/50 mb-2">
                          Lojas vinculadas ({lojas.length})
                        </div>
                        {lojas.length === 0 ? (
                          <div className="text-xs text-white/40">Nenhuma loja vinculada a este revendedor.</div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {lojas.map((l) => (
                              <span
                                key={l.id}
                                className={`text-xs px-2 py-1 rounded-md border ${l.ativa ? "border-white/15 bg-white/5 text-white/80" : "border-white/10 bg-white/[0.02] text-white/40 line-through"}`}
                                title={l.cidade ?? ""}
                              >
                                {l.nome}{l.cidade ? ` · ${l.cidade}` : ""}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
