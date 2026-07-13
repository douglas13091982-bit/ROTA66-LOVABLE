import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, MapPin, Play } from "lucide-react";
import { criarFranqueado, excluirFranqueado, gerarFaturasFranquiaAgora, listarEmailsFranqueados } from "@/lib/franqueados.functions";
import { useFranquia } from "@/hooks/use-franquia";
import { formatCurrency } from "@/lib/format";

type Franqueado = {
  user_id: string;
  cidade: string;
  mensalidade_valor: number;
  dia_vencimento: number;
  ativo: boolean;
  bloqueado_por_inadimplencia: boolean;
};

type Fatura = {
  id: string;
  franqueado_user_id: string;
  competencia: string;
  valor: number;
  vencimento: string;
  status: string;
  mp_link: string | null;
  pago_em: string | null;
};

export function AdminFranqueadosPage() {
  const qc = useQueryClient();
  const { isOwner, loading: loadingFranq } = useFranquia();
  const criar = useServerFn(criarFranqueado);
  const excluir = useServerFn(excluirFranqueado);
  const gerarAgora = useServerFn(gerarFaturasFranquiaAgora);
  const buscarEmails = useServerFn(listarEmailsFranqueados);

  const { data: franqueados, isLoading } = useQuery({
    queryKey: ["admin-franqueados"],
    enabled: isOwner,
    queryFn: async (): Promise<Franqueado[]> => {
      const { data, error } = await (supabase as any)
        .from("franqueados_config")
        .select("*")
        .order("cidade");
      if (error) throw error;
      return (data ?? []) as Franqueado[];
    },
  });

  const { data: perfis } = useQuery({
    queryKey: ["admin-franqueados-perfis", franqueados?.map((f) => f.user_id).join(",")],
    enabled: isOwner && !!franqueados?.length,
    queryFn: async () => {
      const ids = franqueados!.map((f) => f.user_id);
      const { data } = await supabase.from("profiles").select("id, full_name, phone").in("id", ids);
      const map: Record<string, { nome: string; fone: string | null }> = {};
      for (const p of (data ?? []) as any[]) map[p.id] = { nome: p.full_name ?? "—", fone: p.phone };
      return map;
    },
  });

  const { data: emails } = useQuery({
    queryKey: ["admin-franqueados-emails", franqueados?.map((f) => f.user_id).join(",")],
    enabled: isOwner && !!franqueados?.length,
    queryFn: async () => await buscarEmails({ data: { user_ids: franqueados!.map((f) => f.user_id) } }),
  });

  const { data: faturas } = useQuery({
    queryKey: ["admin-franqueados-faturas"],
    enabled: isOwner,
    queryFn: async (): Promise<Fatura[]> => {
      const { data, error } = await (supabase as any)
        .from("franqueados_faturas")
        .select("*")
        .order("vencimento", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Fatura[];
    },
  });

  const { data: cidades } = useQuery({
    queryKey: ["admin-franqueados-cidades"],
    enabled: isOwner,
    queryFn: async (): Promise<{ nome: string; uf: string | null }[]> => {
      const { data, error } = await supabase
        .from("cidades")
        .select("nome, uf")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as any;
    },
  });

  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    telefone: "",
    documento: "",
    cidade: "",
    mensalidade_valor: "0",
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
          cidade: form.cidade,
          mensalidade_valor: Number(form.mensalidade_valor) || 0,
          dia_vencimento: Number(form.dia_vencimento) || 5,
        },
      });
    },
    onSuccess: () => {
      toast.success("Franqueado criado");
      setForm({ nome: "", email: "", senha: "", telefone: "", documento: "", cidade: "", mensalidade_valor: "0", dia_vencimento: "5" });
      qc.invalidateQueries({ queryKey: ["admin-franqueados"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar"),
  });

  const updateMut = useMutation({
    mutationFn: async (r: Partial<Franqueado> & { user_id: string }) => {
      const { user_id, ...patch } = r;
      const { error } = await (supabase as any).from("franqueados_config").update(patch).eq("user_id", user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atualizado");
      qc.invalidateQueries({ queryKey: ["admin-franqueados"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const delMut = useMutation({
    mutationFn: async (user_id: string) => {
      await excluir({ data: { user_id } });
    },
    onSuccess: () => {
      toast.success("Excluído");
      qc.invalidateQueries({ queryKey: ["admin-franqueados"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const gerarMut = useMutation({
    mutationFn: async () => await gerarAgora({} as any),
    onSuccess: (r: any) => {
      toast.success(`Faturas geradas: ${r?.criadas ?? 0}`);
      qc.invalidateQueries({ queryKey: ["admin-franqueados-faturas"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  if (loadingFranq) {
    return <AdminShell title="Franqueados"><div className="text-white/50 text-sm">Carregando…</div></AdminShell>;
  }

  if (!isOwner) {
    return (
      <AdminShell title="Franqueados">
        <div className="max-w-md mx-auto mt-12 text-center pp-card rounded-2xl p-8">
          <div className="text-lg font-semibold text-white mb-1">Acesso restrito</div>
          <div className="text-sm text-white/60">Apenas o owner da franquia acessa esta área.</div>
        </div>
      </AdminShell>
    );
  }

  const faturasPorFranq: Record<string, Fatura[]> = {};
  for (const f of faturas ?? []) (faturasPorFranq[f.franqueado_user_id] ??= []).push(f);

  return (
    <AdminShell title="Franqueados">
      <div className="max-w-5xl space-y-8">
        <section className="pp-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="h-5 w-5 text-white/80" />
            <h2 className="text-lg font-semibold text-white">Novo franqueado</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30" placeholder="Nome completo" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            <input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30" placeholder="Senha inicial" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
            <input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30" placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            <input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30" placeholder="CPF/CNPJ" value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
            <select
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30"
              value={form.cidade}
              onChange={(e) => setForm({ ...form, cidade: e.target.value })}
            >
              <option value="">Selecione a cidade…</option>
              {(cidades ?? []).map((c) => (
                <option key={c.nome} value={c.nome} className="bg-zinc-900">
                  {c.nome}{c.uf ? ` - ${c.uf}` : ""}
                </option>
              ))}
            </select>
            <label className="text-xs text-white/70 flex flex-col gap-1">
              Mensalidade franquia (R$)
              <input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30" value={form.mensalidade_valor} onChange={(e) => setForm({ ...form, mensalidade_valor: e.target.value })} />
            </label>
            <label className="text-xs text-white/70 flex flex-col gap-1">
              Dia vencimento
              <input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30" value={form.dia_vencimento} onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })} />
            </label>
          </div>
          <button
            className="mt-4 px-4 py-2 rounded-lg font-semibold text-black"
            style={{ background: "var(--rota-gold)" }}
            disabled={createMut.isPending || !form.nome || !form.email || !form.senha || !form.cidade}
            onClick={() => createMut.mutate()}
          >
            {createMut.isPending ? "Criando..." : "Criar franqueado"}
          </button>
        </section>

        <section className="pp-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4 justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-white/80" />
              <h2 className="text-lg font-semibold text-white">Franqueados cadastrados</h2>
            </div>
            <button
              onClick={() => gerarMut.mutate()}
              disabled={gerarMut.isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 flex items-center gap-1.5"
              title="Gera faturas do mês agora (normalmente roda automático às 3h)"
            >
              <Play className="h-3.5 w-3.5" /> Gerar faturas agora
            </button>
          </div>

          {isLoading ? (
            <div className="text-white/50 text-sm">Carregando…</div>
          ) : !franqueados?.length ? (
            <div className="text-white/50 text-sm">Nenhum franqueado cadastrado.</div>
          ) : (
            <div className="space-y-2">
              {franqueados.map((r) => {
                const perfil = perfis?.[r.user_id];
                const fats = faturasPorFranq[r.user_id] ?? [];
                return (
                  <div key={r.user_id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-center gap-3 justify-between">
                      <div>
                        <div className="text-white font-semibold flex items-center gap-2">
                          {perfil?.nome ?? "—"}
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/5 text-white/70">{r.cidade}</span>
                          {r.bloqueado_por_inadimplencia && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-600/20 text-red-400">Inadimplente</span>
                          )}
                        </div>
                        <div className="text-xs text-white/60">{perfil?.fone ?? ""}</div>
                        {emails?.[r.user_id] && (
                          <div className="text-xs text-white/50 mt-0.5 break-all">{emails[r.user_id]}</div>
                        )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateMut.mutate({ user_id: r.user_id, ativo: !r.ativo })}
                          className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded ${r.ativo ? "bg-green-600/20 text-green-400" : "bg-zinc-600/20 text-zinc-400"}`}
                        >
                          {r.ativo ? "Ativo" : "Inativo"}
                        </button>
                        <button
                          onClick={() => confirm(`Excluir franqueado?`) && delMut.mutate(r.user_id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <label className="text-[11px] text-white/60 flex flex-col gap-1">
                        Mensalidade (R$)
                        <input
                          defaultValue={r.mensalidade_valor}
                          className="w-full px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30"
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v !== r.mensalidade_valor) updateMut.mutate({ user_id: r.user_id, mensalidade_valor: v });
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

                    {fats.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="text-[11px] uppercase tracking-wide text-white/50 mb-2">Faturas</div>
                        <div className="space-y-1">
                          {fats.slice(0, 6).map((f) => (
                            <div key={f.id} className="flex items-center justify-between text-xs">
                              <span className="text-white/70">{f.competencia} · venc {f.vencimento}</span>
                              <span className="text-white/60">{formatCurrency(f.valor)}</span>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                f.status === "pago" ? "bg-green-600/20 text-green-400" :
                                f.status === "vencido" ? "bg-red-600/20 text-red-400" :
                                "bg-yellow-600/20 text-yellow-400"
                              }`}>{f.status}</span>
                              {f.status !== "pago" && (
                                <button
                                  onClick={async () => {
                                    const { error } = await (supabase as any).from("franqueados_faturas")
                                      .update({ status: "pago", pago_em: new Date().toISOString() })
                                      .eq("id", f.id);
                                    if (error) toast.error(error.message);
                                    else {
                                      toast.success("Marcada como paga");
                                      qc.invalidateQueries({ queryKey: ["admin-franqueados-faturas"] });
                                    }
                                  }}
                                  className="text-[10px] text-white/60 hover:text-white underline"
                                >marcar paga</button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
