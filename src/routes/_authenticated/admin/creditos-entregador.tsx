import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Save, Plus, Minus, RefreshCw } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/creditos-entregador")({
  component: AdminCreditosEntregador,
});

const brl = (n: number | string | null | undefined) => formatCurrency(Number(n ?? 0));

function AdminCreditosEntregador() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"config" | "entregadores" | "transacoes">("config");

  // --- Config
  const cfgQ = useQuery({
    queryKey: ["admin-creditos-config"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_config_creditos_admin" as any);
      if (error) throw error;
      return (data as any)?.[0] ?? null;
    },
  });

  const [form, setForm] = useState<any>(null);
  const cfg = cfgQ.data;
  const f = form ?? cfg;

  const update = (patch: any) => setForm({ ...(form ?? cfg ?? {}), ...patch });

  const salvar = async () => {
    if (!f) return;

    const { error } = await supabase.rpc("salvar_config_creditos" as any, {
      _ativo: !!f.ativo,
      _mensalidade: Number(f.mensalidade_valor) || 0,
      _dia: Number(f.dia_vencimento) || 1,
      _saldo_minimo: Number(f.saldo_minimo) || 0,
      _mp_access_token: f._mp_access_token_novo ?? "",
      _mp_public_key: f.mp_public_key ?? "",
      _valores_sugeridos: [],
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Configuração salva");
    setForm(null);
    qc.invalidateQueries({ queryKey: ["admin-creditos-config"] });
  };

  // --- Entregadores
  const entQ = useQuery({
    queryKey: ["admin-creditos-entregadores"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("super_admin_listar_creditos" as any);
      if (error) throw error;
      return data as any[];
    },
    enabled: tab === "entregadores",
  });

  const ajustar = async (entregador_id: string, nome: string) => {
    const txt = prompt(`Ajuste manual de saldo para "${nome}" (R$, use - para débito):`, "0");
    if (txt === null) return;
    const v = Number(String(txt).replace(",", "."));
    if (!Number.isFinite(v) || v === 0) {
      toast.error("Valor inválido");
      return;
    }
    const motivo = prompt("Motivo do ajuste:", "");
    if (!motivo) return;
    const { error } = await supabase.rpc("super_admin_ajustar_saldo" as any, {
      _entregador_id: entregador_id,
      _delta: v,
      _descricao: motivo,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saldo ajustado");
    qc.invalidateQueries({ queryKey: ["admin-creditos-entregadores"] });
    qc.invalidateQueries({ queryKey: ["admin-creditos-transacoes"] });
  };

  // --- Transações
  const txQ = useQuery({
    queryKey: ["admin-creditos-transacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entregador_creditos_transacoes" as any)
        .select("id, entregador_id, tipo, valor, saldo_apos, descricao, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
    enabled: tab === "transacoes",
  });

  const nomesQ = useQuery({
    queryKey: ["admin-creditos-nomes", txQ.data?.length],
    enabled: !!txQ.data?.length,
    queryFn: async () => {
      const ids = Array.from(new Set((txQ.data ?? []).map((t) => t.entregador_id)));
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map: Record<string, string> = {};
      (data ?? []).forEach((p: any) => (map[p.id] = p.full_name ?? p.id));
      return map;
    },
  });

  const tipoCls: Record<string, string> = {
    recarga: "text-green-400",
    mensalidade: "text-amber-400",
    ajuste_manual: "text-blue-400",
    estorno: "text-purple-400",
  };

  return (
    <AdminShell title="Créditos do entregador">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/10 grid place-items-center">
          <Wallet className="h-5 w-5 text-white/80" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Mensalidade e créditos</h1>
          <p className="text-sm text-white/50">Configure a cobrança recorrente dos entregadores</p>
        </div>
      </div>

      <div className="flex gap-2 mb-5 border-b border-white/8">
        {([
          ["config", "Configuração"],
          ["entregadores", "Entregadores"],
          ["transacoes", "Transações"],
        ] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k as any)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              tab === k ? "border-white text-white" : "border-transparent text-white/50 hover:text-white"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "config" && (
        <div className="space-y-5 max-w-2xl">
          {cfgQ.isLoading && <p className="text-white/50">Carregando...</p>}
          {f && (
            <>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                <label className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-white">Cobrança ativa</div>
                    <div className="text-xs text-white/50">Quando desativada, ninguém é cobrado nem bloqueado</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!f.ativo}
                    onChange={(e) => update({ ativo: e.target.checked })}
                    className="h-5 w-5"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1">
                      Mensalidade (R$)
                    </label>
                    <input
                      type="number" step="0.01" min="0"
                      value={f.mensalidade_valor ?? 0}
                      onChange={(e) => update({ mensalidade_valor: e.target.value })}
                      className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1">
                      Dia de vencimento (1-28)
                    </label>
                    <input
                      type="number" min="1" max="28"
                      value={f.dia_vencimento ?? 1}
                      onChange={(e) => update({ dia_vencimento: e.target.value })}
                      className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1">
                      Saldo mínimo (R$) para receber pedidos
                    </label>
                    <input
                      type="number" step="0.01"
                      value={f.saldo_minimo ?? 0}
                      onChange={(e) => update({ saldo_minimo: e.target.value })}
                      className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white"
                    />
                    <p className="text-[11px] text-white/40 mt-1">Pode ser negativo para permitir crédito (ex: -10)</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Mercado Pago do sistema</h3>
                  <p className="text-xs text-white/50">Credenciais usadas para receber recargas dos entregadores</p>
                </div>
                <div className="text-[11px] text-white/60">
                  Status: {f.mp_configurado ? <span className="text-green-400">configurado</span> : <span className="text-amber-400">não configurado</span>}
                  {f.mp_access_token_masked && <span className="ml-2 font-mono text-white/40">{f.mp_access_token_masked}</span>}
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1">
                    Access Token (deixe em branco para manter)
                  </label>
                  <input
                    type="password"
                    placeholder="APP_USR-..."
                    value={f._mp_access_token_novo ?? ""}
                    onChange={(e) => update({ _mp_access_token_novo: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1">
                    Public Key
                  </label>
                  <input
                    type="text"
                    value={f.mp_public_key ?? ""}
                    onChange={(e) => update({ mp_public_key: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white font-mono text-sm"
                  />
                </div>
                <div className="text-[11px] text-white/50 leading-relaxed bg-black/30 p-3 rounded-md border border-white/5">
                  <div className="font-bold mb-1">URL de webhook para configurar no Mercado Pago:</div>
                  <code className="text-white/80 break-all">{typeof window !== "undefined" ? window.location.origin : ""}/api/public/mp-webhook-entregador</code>
                </div>
              </div>

              <button
                onClick={salvar}
                disabled={!form}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white text-black font-bold text-sm uppercase tracking-wider disabled:opacity-40"
              >
                <Save className="h-4 w-4" /> Salvar
              </button>
            </>
          )}
        </div>
      )}

      {tab === "entregadores" && (
        <div className="space-y-2">
          {entQ.isLoading && <p className="text-white/50">Carregando...</p>}
          {(entQ.data ?? []).map((e: any) => (
            <div key={e.entregador_id} className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/[0.02]">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">{e.full_name ?? "—"}</div>
                <div className="text-xs text-white/50">{e.phone ?? "—"} · {e.status_conta}</div>
              </div>
              <div className={`text-right font-mono ${Number(e.saldo) < 0 ? "text-red-400" : "text-white"}`}>
                <div className="font-bold">{brl(e.saldo)}</div>
                {e.ultima_competencia_cobrada && (
                  <div className="text-[10px] text-white/40">Últ. cob. {new Date(e.ultima_competencia_cobrada).toLocaleDateString("pt-BR")}</div>
                )}
              </div>
              <button
                onClick={() => ajustar(e.entregador_id, e.full_name ?? "entregador")}
                className="px-3 py-1.5 text-xs font-bold uppercase rounded-md bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
              >
                Ajustar
              </button>
            </div>
          ))}
          {!entQ.isLoading && (entQ.data ?? []).length === 0 && (
            <p className="text-white/50 text-center py-8">Nenhum entregador.</p>
          )}
        </div>
      )}

      {tab === "transacoes" && (
        <div className="space-y-1">
          {txQ.isLoading && <p className="text-white/50">Carregando...</p>}
          {(txQ.data ?? []).map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/[0.02] text-sm">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">{nomesQ.data?.[t.entregador_id] ?? t.entregador_id}</div>
                <div className="text-xs text-white/50 truncate">
                  <span className={`uppercase font-bold ${tipoCls[t.tipo] ?? ""}`}>{t.tipo}</span>
                  {t.descricao ? ` · ${t.descricao}` : ""}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`font-mono font-bold ${Number(t.valor) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {Number(t.valor) >= 0 ? "+" : ""}{brl(t.valor)}
                </div>
                <div className="text-[10px] text-white/40">{formatDateTime(t.created_at)} · saldo {brl(t.saldo_apos)}</div>
              </div>
            </div>
          ))}
          {!txQ.isLoading && (txQ.data ?? []).length === 0 && (
            <p className="text-white/50 text-center py-8">Nenhuma transação.</p>
          )}
        </div>
      )}
    </AdminShell>
  );
}
