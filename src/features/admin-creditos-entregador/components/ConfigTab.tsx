import { useState } from "react";
import { Save } from "lucide-react";
import { useCreditosConfig } from "../hooks/use-creditos-config";
import type { ConfigCreditos } from "../logic/types";

export function ConfigTab() {
  const { data: cfg, isLoading, salvar } = useCreditosConfig();
  const [form, setForm] = useState<ConfigCreditos | null>(null);
  const f = form ?? cfg;
  const update = (patch: Partial<ConfigCreditos>) =>
    setForm({ ...((form ?? cfg) as ConfigCreditos), ...patch });

  if (isLoading) return <p className="text-white/50">Carregando...</p>;
  if (!f) return null;

  const onSalvar = async () => {
    const ok = await salvar(f);
    if (ok) setForm(null);
  };

  const webhookUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/mp-webhook-entregador`;

  return (
    <div className="space-y-5 max-w-2xl">
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
          <code className="text-white/80 break-all">{webhookUrl}</code>
        </div>
      </div>

      <button
        onClick={onSalvar}
        disabled={!form}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white text-black font-bold text-sm uppercase tracking-wider disabled:opacity-40"
      >
        <Save className="h-4 w-4" /> Salvar
      </button>
    </div>
  );
}
