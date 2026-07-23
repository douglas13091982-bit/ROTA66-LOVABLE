import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useFranquia } from "@/hooks/use-franquia";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { Plus, Trash2, Users, Wallet, TrendingDown, TrendingUp, Save } from "lucide-react";

type Socio = {
  id: string;
  franqueado_user_id: string;
  nome: string;
  percentual: number;
  ordem: number;
};

type Despesa = {
  id: string;
  franqueado_user_id: string;
  descricao: string;
  categoria: string | null;
  tipo: "despesa" | "investimento";
  valor: number;
  competencia: string; // YYYY-MM
  pago: boolean;
  observacao: string | null;
  created_at: string;
  recorrente: boolean;
  recorrencia_id: string | null;
};

function competenciaAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtCompetencia(c: string) {
  const [y, m] = c.split("-");
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${meses[Number(m) - 1] ?? m}/${y}`;
}

export function AdminDespesasPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { loading: loadingFranq, isColaborador, config } = useFranquia();

  // franqueado_user_id "dono" das despesas: se é colaborador, usa o franqueado vinculado; senão o próprio user
  const franqueadoUserId = isColaborador ? config?.user_id ?? null : user?.id ?? null;

  const [competencia, setCompetencia] = useState<string>(competenciaAtual());
  const [form, setForm] = useState({
    descricao: "",
    categoria: "",
    tipo: "despesa" as "despesa" | "investimento",
    valor: "",
    observacao: "",
    recorrente: false,
    meses: "12",
  });

  const { data: socios, isLoading: loadingSocios } = useQuery({
    queryKey: ["franqueado-socios", franqueadoUserId],
    enabled: !!franqueadoUserId,
    queryFn: async (): Promise<Socio[]> => {
      const { data, error } = await (supabase as any)
        .from("franqueado_socios")
        .select("*")
        .eq("franqueado_user_id", franqueadoUserId)
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as Socio[];
    },
  });

  // Auto-seed de sócios padrão na primeira carga (apenas o próprio franqueado, não colaborador)
  useEffect(() => {
    if (!franqueadoUserId || isColaborador || !socios || socios.length > 0) return;
    (async () => {
      const defaults = [
        { nome: "Douglas", percentual: 50, ordem: 0 },
        { nome: "Sócio 2", percentual: 25, ordem: 1 },
        { nome: "Sócio 3", percentual: 25, ordem: 2 },
      ].map((s) => ({ ...s, franqueado_user_id: franqueadoUserId }));
      const { error } = await (supabase as any).from("franqueado_socios").insert(defaults);
      if (!error) qc.invalidateQueries({ queryKey: ["franqueado-socios", franqueadoUserId] });
    })();
  }, [franqueadoUserId, isColaborador, socios, qc]);

  const { data: despesas, isLoading: loadingDespesas } = useQuery({
    queryKey: ["franqueado-despesas", franqueadoUserId, competencia],
    enabled: !!franqueadoUserId,
    queryFn: async (): Promise<Despesa[]> => {
      const { data, error } = await (supabase as any)
        .from("franqueado_despesas")
        .select("*")
        .eq("franqueado_user_id", franqueadoUserId)
        .eq("competencia", competencia)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Despesa[];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const valor = Number(form.valor.replace(",", "."));
      if (!form.descricao.trim() || !valor || valor <= 0) throw new Error("Preencha descrição e valor");

      // Monta as competências (recorrente = N meses a partir da competência atual)
      const meses = form.recorrente ? Math.min(Math.max(Number(form.meses) || 12, 1), 60) : 1;
      const recorrencia_id = form.recorrente
        ? (globalThis.crypto?.randomUUID?.() ??
            `${Date.now()}-${Math.random().toString(36).slice(2)}`)
        : null;

      const [yStr, mStr] = competencia.split("-");
      const baseYear = Number(yStr);
      const baseMonth = Number(mStr); // 1-12
      const rows = Array.from({ length: meses }).map((_, i) => {
        const total = baseMonth - 1 + i;
        const y = baseYear + Math.floor(total / 12);
        const m = (total % 12) + 1;
        const comp = `${y}-${String(m).padStart(2, "0")}`;
        return {
          franqueado_user_id: franqueadoUserId,
          descricao: form.descricao.trim(),
          categoria: form.categoria.trim() || null,
          tipo: form.tipo,
          valor,
          competencia: comp,
          observacao: form.observacao.trim() || null,
          created_by: user?.id,
          recorrente: form.recorrente,
          recorrencia_id,
        };
      });

      const { error } = await (supabase as any).from("franqueado_despesas").insert(rows);
      if (error) throw error;
      return { meses };
    },
    onSuccess: (r) => {
      toast.success(
        r.meses > 1
          ? `Programado em ${r.meses} meses`
          : "Lançamento adicionado",
      );
      setForm({ descricao: "", categoria: "", tipo: "despesa", valor: "", observacao: "", recorrente: false, meses: "12" });
      qc.invalidateQueries({ queryKey: ["franqueado-despesas", franqueadoUserId, competencia] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao adicionar"),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("franqueado_despesas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Excluído");
      qc.invalidateQueries({ queryKey: ["franqueado-despesas", franqueadoUserId, competencia] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const delSerieMut = useMutation({
    mutationFn: async (d: Despesa) => {
      if (!d.recorrencia_id) throw new Error("Não é uma série recorrente");
      // Remove apenas a competência atual e futuras (mantém histórico já pago)
      const { error } = await (supabase as any)
        .from("franqueado_despesas")
        .delete()
        .eq("recorrencia_id", d.recorrencia_id)
        .gte("competencia", d.competencia);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Série encerrada a partir deste mês");
      qc.invalidateQueries({ queryKey: ["franqueado-despesas", franqueadoUserId, competencia] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const togglePagoMut = useMutation({
    mutationFn: async (d: Despesa) => {
      const { error } = await (supabase as any)
        .from("franqueado_despesas")
        .update({ pago: !d.pago })
        .eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["franqueado-despesas", franqueadoUserId, competencia] }),
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const updateSocioMut = useMutation({
    mutationFn: async (s: Partial<Socio> & { id: string }) => {
      const { id, ...patch } = s;
      const { error } = await (supabase as any).from("franqueado_socios").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sócio atualizado");
      qc.invalidateQueries({ queryKey: ["franqueado-socios", franqueadoUserId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const addSocioMut = useMutation({
    mutationFn: async () => {
      const ordem = (socios?.length ?? 0);
      const { error } = await (supabase as any).from("franqueado_socios").insert({
        franqueado_user_id: franqueadoUserId,
        nome: `Sócio ${ordem + 1}`,
        percentual: 0,
        ordem,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["franqueado-socios", franqueadoUserId] }),
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const delSocioMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("franqueado_socios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["franqueado-socios", franqueadoUserId] }),
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const totais = useMemo(() => {
    const lista = despesas ?? [];
    const despesa = lista.filter((d) => d.tipo === "despesa").reduce((s, d) => s + Number(d.valor), 0);
    const investimento = lista.filter((d) => d.tipo === "investimento").reduce((s, d) => s + Number(d.valor), 0);
    const total = despesa + investimento;
    const pago = lista.filter((d) => d.pago).reduce((s, d) => s + Number(d.valor), 0);
    const aberto = total - pago;
    return { despesa, investimento, total, pago, aberto };
  }, [despesas]);

  const somaPct = (socios ?? []).reduce((s, x) => s + Number(x.percentual), 0);
  const pctOk = Math.abs(somaPct - 100) < 0.01;

  if (loadingFranq) {
    return (
      <AdminShell title="Despesas do negócio">
        <div className="text-white/50 text-sm">Carregando…</div>
      </AdminShell>
    );
  }

  if (!franqueadoUserId) {
    return (
      <AdminShell title="Despesas do negócio">
        <div className="max-w-md mx-auto mt-12 text-center pp-card rounded-2xl p-8">
          <div className="text-lg font-semibold text-white mb-1">Acesso restrito</div>
          <div className="text-sm text-white/60">Área disponível para franqueados e colaboradores.</div>
        </div>
      </AdminShell>
    );
  }

  // Últimos 12 meses para o seletor
  const opcoesCompetencia = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  return (
    <AdminShell title="Despesas do negócio">
      <div className="max-w-5xl space-y-6">
        {/* Sócios */}
        <section className="pp-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4 justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-white/80" />
              <h2 className="text-lg font-semibold text-white">Sócios & divisão</h2>
            </div>
            {!isColaborador && (
              <button
                onClick={() => addSocioMut.mutate()}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Novo sócio
              </button>
            )}
          </div>

          {loadingSocios ? (
            <div className="text-white/50 text-sm">Carregando…</div>
          ) : (
            <>
              <div className="space-y-2">
                {(socios ?? []).map((s) => (
                  <div key={s.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <input
                      defaultValue={s.nome}
                      disabled={isColaborador}
                      className="flex-1 px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30 disabled:opacity-60"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== s.nome) updateSocioMut.mutate({ id: s.id, nome: v });
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <input
                        defaultValue={s.percentual}
                        disabled={isColaborador}
                        type="number"
                        step="0.01"
                        className="w-20 px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-white text-sm text-right focus:outline-none focus:border-white/30 disabled:opacity-60"
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (!Number.isNaN(v) && v !== Number(s.percentual))
                            updateSocioMut.mutate({ id: s.id, percentual: v });
                        }}
                      />
                      <span className="text-white/60 text-sm">%</span>
                    </div>
                    {!isColaborador && (
                      <button
                        onClick={() => confirm(`Excluir ${s.nome}?`) && delSocioMut.mutate(s.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className={`mt-3 text-xs ${pctOk ? "text-green-400" : "text-yellow-400"}`}>
                Soma dos percentuais: <span className="font-bold">{somaPct.toFixed(2)}%</span>
                {!pctOk && " — ajuste para totalizar 100%"}
              </div>
            </>
          )}
        </section>

        {/* Novo lançamento */}
        <section className="pp-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4 justify-between flex-wrap">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-white/80" />
              <h2 className="text-lg font-semibold text-white">Novo lançamento</h2>
            </div>
            <select
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30"
            >
              {opcoesCompetencia.map((c) => (
                <option key={c} value={c} className="bg-zinc-900">
                  {fmtCompetencia(c)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <input
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30"
              placeholder="Descrição (ex: Aluguel escritório)"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
            <input
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30"
              placeholder="Categoria (ex: Marketing, Infra)"
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            />
            <select
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/30"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as "despesa" | "investimento" })}
            >
              <option value="despesa" className="bg-zinc-900">Despesa</option>
              <option value="investimento" className="bg-zinc-900">Investimento</option>
            </select>
            <input
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30"
              placeholder="Valor (R$)"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
            />
            <input
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30 sm:col-span-2"
              placeholder="Observação (opcional)"
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            />
          </div>

          {/* Recorrência mensal */}
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.recorrente}
                onChange={(e) => setForm({ ...form, recorrente: e.target.checked })}
                className="h-4 w-4 accent-yellow-500"
              />
              <span>Esta despesa é <b>mensal</b> (recorrente)</span>
            </label>
            {form.recorrente && (
              <div className="flex items-center gap-2 text-sm text-white/80">
                <span>Programar por</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={form.meses}
                  onChange={(e) => setForm({ ...form, meses: e.target.value })}
                  className="w-20 px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-white text-sm text-right focus:outline-none focus:border-white/30"
                />
                <span>meses</span>
                <span className="text-xs text-white/50">— lançamentos serão criados automaticamente</span>
              </div>
            )}
          </div>

          <button
            className="mt-4 px-4 py-2 rounded-lg font-semibold text-black flex items-center gap-2"
            style={{ background: "var(--rota-gold)" }}
            disabled={addMut.isPending}
            onClick={() => addMut.mutate()}
          >
            <Save className="h-4 w-4" />
            {addMut.isPending ? "Salvando..." : "Adicionar"}
          </button>
        </section>

        {/* Resumo */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="pp-card rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs uppercase text-white/60"><TrendingDown className="h-3.5 w-3.5" /> Despesas</div>
            <div className="text-xl font-bold text-white mt-1">{formatCurrency(totais.despesa)}</div>
          </div>
          <div className="pp-card rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs uppercase text-white/60"><TrendingUp className="h-3.5 w-3.5" /> Investimentos</div>
            <div className="text-xl font-bold text-white mt-1">{formatCurrency(totais.investimento)}</div>
          </div>
          <div className="pp-card rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs uppercase text-white/60"><Wallet className="h-3.5 w-3.5" /> Total do mês</div>
            <div className="text-xl font-bold text-white mt-1">{formatCurrency(totais.total)}</div>
          </div>
          <div className="pp-card rounded-2xl p-4">
            <div className="flex items-center gap-2 text-xs uppercase text-white/60">Em aberto</div>
            <div className="text-xl font-bold text-yellow-400 mt-1">{formatCurrency(totais.aberto)}</div>
            <div className="text-[10px] text-white/50 mt-0.5">Pago: {formatCurrency(totais.pago)}</div>
          </div>
        </section>

        {/* Divisão por sócio */}
        <section className="pp-card rounded-2xl p-6">
          <h3 className="text-sm uppercase tracking-wide text-white/60 mb-3">Divisão entre sócios — {fmtCompetencia(competencia)}</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {(socios ?? []).map((s) => {
              const parte = (totais.total * Number(s.percentual)) / 100;
              return (
                <div key={s.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="text-white font-semibold">{s.nome}</div>
                  <div className="text-xs text-white/60">{Number(s.percentual).toFixed(2)}% do total</div>
                  <div className="text-2xl font-bold mt-2" style={{ color: "var(--rota-gold)" }}>
                    {formatCurrency(parte)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Lista */}
        <section className="pp-card rounded-2xl p-6">
          <h3 className="text-sm uppercase tracking-wide text-white/60 mb-3">Lançamentos — {fmtCompetencia(competencia)}</h3>
          {loadingDespesas ? (
            <div className="text-white/50 text-sm">Carregando…</div>
          ) : !despesas?.length ? (
            <div className="text-white/50 text-sm">Nenhum lançamento neste mês.</div>
          ) : (
            <div className="space-y-2">
              {despesas.map((d) => (
                <div key={d.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[180px]">
                    <div className="text-white font-medium flex items-center gap-2 flex-wrap">
                      {d.descricao}
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        d.tipo === "investimento" ? "bg-blue-600/20 text-blue-300" : "bg-white/10 text-white/70"
                      }`}>{d.tipo}</span>
                      {d.categoria && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/5 text-white/60">{d.categoria}</span>
                      )}
                    </div>
                    {d.observacao && <div className="text-xs text-white/50 mt-0.5">{d.observacao}</div>}
                  </div>
                  <div className="text-white font-bold">{formatCurrency(Number(d.valor))}</div>
                  <button
                    onClick={() => togglePagoMut.mutate(d)}
                    className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded ${
                      d.pago ? "bg-green-600/20 text-green-400" : "bg-yellow-600/20 text-yellow-400"
                    }`}
                  >
                    {d.pago ? "Pago" : "Em aberto"}
                  </button>
                  <button
                    onClick={() => confirm("Excluir lançamento?") && delMut.mutate(d.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
