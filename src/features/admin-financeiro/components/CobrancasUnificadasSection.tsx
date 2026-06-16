import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Store, Bike, ExternalLink, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type MensRow = {
  id: string;
  loja_id: string;
  competencia: string;
  valor: number;
  valor_tarifas_pedidos?: number | null;
  vencimento: string;
  pago: boolean;
  pago_em: string | null;
  mp_payment_status?: string | null;
  loja_nome?: string;
};

type RecargaRow = {
  id: string;
  entregador_id: string;
  valor: number;
  status: string;
  creditado: boolean;
  created_at: string;
  mp_payment_id: string | null;
  entregador_nome?: string;
};

const moeda = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const dataBR = (s: string | null | undefined) => {
  if (!s) return "—";
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s);
  return d.toLocaleDateString("pt-BR");
};

function StatusPill({ ok, label }: { ok: "ok" | "wait" | "fail"; label: string }) {
  const map = {
    ok: { cls: "bg-green-500/10 text-green-500 border-green-500/30", Icon: CheckCircle2 },
    wait: { cls: "bg-amber-500/10 text-amber-500 border-amber-500/30", Icon: Clock },
    fail: { cls: "bg-red-500/10 text-red-500 border-red-500/30", Icon: AlertCircle },
  }[ok];
  const Ico = map.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded ${map.cls}`}
    >
      <Ico className="h-3 w-3" />
      {label}
    </span>
  );
}

export function CobrancasUnificadasSection() {
  // Mensalidades das lojas
  const lojasQ = useQuery({
    queryKey: ["admin-cobrancas-unificadas", "lojas"],
    queryFn: async (): Promise<MensRow[]> => {
      const { data, error } = await supabase
        .from("mensalidades_loja")
        .select("id, loja_id, competencia, valor, valor_tarifas_pedidos, vencimento, pago, pago_em, mp_payment_status")
        .order("competencia", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = (data ?? []) as MensRow[];
      const ids = Array.from(new Set(rows.map((r) => r.loja_id)));
      if (ids.length === 0) return rows;
      const { data: lojas } = await supabase.from("lojas").select("id, nome").in("id", ids);
      const map = Object.fromEntries((lojas ?? []).map((l: any) => [l.id, l.nome]));
      return rows.map((r) => ({ ...r, loja_nome: map[r.loja_id] }));
    },
  });

  // Recargas/mensalidades dos entregadores
  const entregadoresQ = useQuery({
    queryKey: ["admin-cobrancas-unificadas", "entregadores"],
    queryFn: async (): Promise<RecargaRow[]> => {
      const { data, error } = await supabase
        .from("entregador_recargas_mp" as any)
        .select("id, entregador_id, valor, status, creditado, created_at, mp_payment_id")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = (data ?? []) as RecargaRow[];
      const ids = Array.from(new Set(rows.map((r) => r.entregador_id)));
      if (ids.length === 0) return rows;
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name]));
      return rows.map((r) => ({ ...r, entregador_nome: map[r.entregador_id] }));
    },
  });

  // Config mensalidade entregador
  const configEntregadorQ = useQuery({
    queryKey: ["admin-cobrancas-unificadas", "config-entregador"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_config_creditos_admin" as any);
      if (error) throw error;
      return (data as any)?.[0] ?? null;
    },
  });

  const lojas = lojasQ.data ?? [];
  const recargas = entregadoresQ.data ?? [];
  const cfgEnt = configEntregadorQ.data;

  // Totais lojas
  const lojasAbertas = lojas.filter((m) => !m.pago);
  const lojasPagas = lojas.filter((m) => m.pago);
  const totalLojasAberto = lojasAbertas.reduce(
    (s, m) => s + Number(m.valor) + Number(m.valor_tarifas_pedidos ?? 0),
    0,
  );
  const totalLojasPago = lojasPagas.reduce(
    (s, m) => s + Number(m.valor) + Number(m.valor_tarifas_pedidos ?? 0),
    0,
  );

  // Totais entregadores
  const recargasApr = recargas.filter((r) => r.status === "approved");
  const recargasPend = recargas.filter((r) => r.status !== "approved");
  const totalEntPago = recargasApr.reduce((s, r) => s + Number(r.valor), 0);
  const totalEntPend = recargasPend.reduce((s, r) => s + Number(r.valor), 0);

  const loading = lojasQ.isLoading || entregadoresQ.isLoading;

  return (
    <section className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div>
        <h2 className="font-display text-xl mb-1">Cobranças mensais — Lojas e Entregadores</h2>
        <p className="text-sm text-muted-foreground">
          Visão única de todas as cobranças mensais da plataforma. Lojas e entregadores são
          cobrados <strong>na mesma conta Mercado Pago</strong>, validados pelo{" "}
          <strong>mesmo webhook</strong> configurado acima.
        </p>
      </div>

      {/* Resumo geral */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lojas */}
        <div className="rounded-lg border border-border bg-background p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg">Lojas</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Em aberto
              </div>
              <div className="font-display text-2xl text-primary">{moeda(totalLojasAberto)}</div>
              <div className="text-xs text-muted-foreground">{lojasAbertas.length} mensalidade(s)</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Recebido
              </div>
              <div className="font-display text-2xl">{moeda(totalLojasPago)}</div>
              <div className="text-xs text-muted-foreground">{lojasPagas.length} pago(s)</div>
            </div>
          </div>
        </div>

        {/* Entregadores */}
        <div className="rounded-lg border border-border bg-background p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bike className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg">Entregadores</h3>
            </div>
            <Link
              to="/admin/creditos-entregador"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              configurar <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Pendentes
              </div>
              <div className="font-display text-2xl text-primary">{moeda(totalEntPend)}</div>
              <div className="text-xs text-muted-foreground">{recargasPend.length} cobrança(s)</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Recebido
              </div>
              <div className="font-display text-2xl">{moeda(totalEntPago)}</div>
              <div className="text-xs text-muted-foreground">{recargasApr.length} pago(s)</div>
            </div>
          </div>
          {cfgEnt && (
            <div className="text-[11px] text-muted-foreground border-t border-border pt-2">
              Mensalidade atual: <strong>{moeda(Number(cfgEnt.mensalidade_valor ?? 0))}</strong> ·
              vencimento dia <strong>{cfgEnt.dia_vencimento}</strong> ·{" "}
              {cfgEnt.ativo ? (
                <span className="text-green-500">ativa</span>
              ) : (
                <span className="text-amber-500">desativada</span>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tabela lojas */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Últimas mensalidades de lojas
            </h3>
            <div className="border border-border rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-background">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-bold">Loja</th>
                    <th className="px-3 py-2 font-bold">Compet.</th>
                    <th className="px-3 py-2 font-bold text-right">Valor</th>
                    <th className="px-3 py-2 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lojas.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                        Nenhuma mensalidade registrada.
                      </td>
                    </tr>
                  )}
                  {lojas.slice(0, 20).map((m) => {
                    const total = Number(m.valor) + Number(m.valor_tarifas_pedidos ?? 0);
                    return (
                      <tr key={m.id} className="border-t border-border">
                        <td className="px-3 py-2 truncate max-w-[140px]">{m.loja_nome ?? "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{dataBR(m.competencia)}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{moeda(total)}</td>
                        <td className="px-3 py-2">
                          {m.pago ? (
                            <StatusPill ok="ok" label="Pago" />
                          ) : m.mp_payment_status === "pending" ? (
                            <StatusPill ok="wait" label="Aguardando" />
                          ) : (
                            <StatusPill ok="wait" label="Em aberto" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabela entregadores */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Últimas cobranças de entregadores
            </h3>
            <div className="border border-border rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-background">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-bold">Entregador</th>
                    <th className="px-3 py-2 font-bold">Data</th>
                    <th className="px-3 py-2 font-bold text-right">Valor</th>
                    <th className="px-3 py-2 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recargas.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                        Nenhuma cobrança registrada.
                      </td>
                    </tr>
                  )}
                  {recargas.slice(0, 20).map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2 truncate max-w-[140px]">
                        {r.entregador_nome ?? "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{dataBR(r.created_at)}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">{moeda(r.valor)}</td>
                      <td className="px-3 py-2">
                        {r.status === "approved" ? (
                          <StatusPill ok="ok" label="Pago" />
                        ) : r.status === "pending" ? (
                          <StatusPill ok="wait" label="Aguardando" />
                        ) : r.status === "error" || r.status === "rejected" ? (
                          <StatusPill ok="fail" label={r.status} />
                        ) : (
                          <StatusPill ok="wait" label={r.status} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
