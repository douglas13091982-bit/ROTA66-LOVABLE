import { useEffect, useState } from "react";
import { INITIAL_PLANO_FORM, type PlanoFormState, type PlanoRow } from "../logic/types";

interface Props {
  editing: PlanoRow | null;
  onCancel: () => void;
  onSubmit: (form: PlanoFormState) => Promise<boolean | void>;
}

export function PlanoForm({ editing, onCancel, onSubmit }: Props) {
  const [form, setForm] = useState<PlanoFormState>(INITIAL_PLANO_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        nome: editing.nome,
        descricao: editing.descricao ?? "",
        mensalidade_valor: String(editing.mensalidade_valor ?? 0),
        taxa_por_pedido: String(editing.taxa_por_pedido ?? 0),
        dia_vencimento: String(editing.dia_vencimento ?? 10),
        destaque: !!editing.destaque,
        ordem: String(editing.ordem ?? 0),
        ativo: !!editing.ativo,
      });
    } else {
      setForm(INITIAL_PLANO_FORM);
    }
  }, [editing]);

  function set<K extends keyof PlanoFormState>(k: K, v: PlanoFormState[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok) {
      if (!editing) setForm(INITIAL_PLANO_FORM);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card border border-border rounded-lg p-4 shadow-card space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{editing ? "Editar plano" : "Novo plano"}</h3>
        {editing && (
          <button type="button" onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground">
            Cancelar edição
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Nome">
          <input
            value={form.nome}
            onChange={(e) => set("nome", e.target.value)}
            className="input"
            required
            placeholder="Ex: Básico, Pro, Premium"
          />
        </Field>
        <Field label="Ordem (menor aparece primeiro)">
          <input
            type="number"
            value={form.ordem}
            onChange={(e) => set("ordem", e.target.value)}
            className="input"
          />
        </Field>
      </div>

      <Field label="Descrição (opcional)">
        <textarea
          value={form.descricao}
          onChange={(e) => set("descricao", e.target.value)}
          className="input min-h-[60px]"
          placeholder="Breve descrição mostrada para a loja"
        />
      </Field>

      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Mensalidade (R$)">
          <input
            type="number"
            step="0.01"
            value={form.mensalidade_valor}
            onChange={(e) => set("mensalidade_valor", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Taxa por pedido (R$)">
          <input
            type="number"
            step="0.01"
            value={form.taxa_por_pedido}
            onChange={(e) => set("taxa_por_pedido", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Dia vencimento (1–28)">
          <input
            type="number"
            min={1}
            max={28}
            value={form.dia_vencimento}
            onChange={(e) => set("dia_vencimento", e.target.value)}
            className="input"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.destaque}
            onChange={(e) => set("destaque", e.target.checked)}
          />
          Marcar como destaque (recomendado)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => set("ativo", e.target.checked)}
          />
          Plano ativo (visível para novas lojas)
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="bg-gradient-red text-primary-foreground font-bold px-4 py-2 rounded-md disabled:opacity-50"
      >
        {saving ? "Salvando..." : editing ? "Atualizar plano" : "Criar plano"}
      </button>

      <style>{`
        .input {
          width: 100%;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 14px;
          color: inherit;
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
        {label}
      </span>
      {children}
    </label>
  );
}
