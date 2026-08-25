import { useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAuth } from "@/hooks/use-auth";
import { useFranquia } from "@/hooks/use-franquia";
import { formatCurrency } from "@/lib/format";
import { Plus, Trash2, Users, Wallet, TrendingDown, TrendingUp, Save } from "lucide-react";
import { useAdminDespesas } from "./hooks/use-admin-despesas";
import { competenciaAtual, fmtCompetencia, ultimasCompetencias } from "./logic/competencia";
import { calcTotais } from "./logic/resumo";
import { FORM_INICIAL, type DespesaForm } from "./logic/types";

export function AdminDespesasPage() {
  const { user } = useAuth();
  const { loading: loadingFranq, isColaborador, config } = useFranquia();

  // franqueado_user_id "dono" das despesas: se é colaborador, usa o franqueado vinculado; senão o próprio user
  const franqueadoUserId = isColaborador ? config?.user_id ?? null : user?.id ?? null;

  const [competencia, setCompetencia] = useState<string>(competenciaAtual());
  const [form, setForm] = useState<DespesaForm>(FORM_INICIAL);

  const {
    socios,
    loadingSocios,
    despesas,
    loadingDespesas,
    addMut,
    delMut,
    delSerieMut,
    togglePagoMut,
    updateSocioMut,
    addSocioMut,
    delSocioMut,
  } = useAdminDespesas({
    franqueadoUserId,
    competencia,
    userId: user?.id,
    isColaborador,
  });

  const totais = useMemo(() => calcTotais(despesas), [despesas]);

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

  const opcoesCompetencia = ultimasCompetencias(12);

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
            onClick={() =>
              addMut.mutate(form, { onSuccess: () => setForm(FORM_INICIAL) })
            }
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
                      {d.recorrente && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                          Mensal
                        </span>
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
                  {d.recorrencia_id && (
                    <button
                      onClick={() =>
                        confirm("Encerrar a recorrência a partir deste mês? Meses futuros serão removidos.") &&
                        delSerieMut.mutate(d)
                      }
                      className="text-[10px] font-bold uppercase px-2.5 py-1 rounded bg-orange-600/20 text-orange-300 hover:bg-orange-600/30"
                      title="Encerrar série recorrente"
                    >
                      Encerrar série
                    </button>
                  )}
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
