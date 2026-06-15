import { useState } from "react";
import { DollarSign, Plus } from "lucide-react";
import { INITIAL_FORM, VEICULOS, type TarifaFormState, type TipoVeiculo } from "../logic/types";
import { FieldLabel, inputClass } from "./FieldLabel";

export function NovaTarifaForm({ onSubmit }: { onSubmit: (form: TarifaFormState) => Promise<boolean> }) {
  const [form, setForm] = useState<TarifaFormState>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok) setForm(INITIAL_FORM);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 shadow-card mb-6">
      <h2 className="font-display text-2xl tracking-wide mb-4 flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-primary" />
        Nova tarifa
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
        <FieldLabel label="Veículo" hint="Tipo de transporte do entregador">
          <select
            value={form.tipo_veiculo}
            onChange={(e) => setForm({ ...form, tipo_veiculo: e.target.value as TipoVeiculo })}
            className={inputClass}
          >
            {VEICULOS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </FieldLabel>

        <FieldLabel label="KM mínimo" hint="Início da faixa de distância">
          <input type="number" step="0.1" value={form.faixa_km_min}
            onChange={(e) => setForm({ ...form, faixa_km_min: e.target.value })} className={inputClass} />
        </FieldLabel>

        <FieldLabel label="KM máximo" hint="Fim da faixa de distância">
          <input type="number" step="0.1" value={form.faixa_km_max}
            onChange={(e) => setForm({ ...form, faixa_km_max: e.target.value })} className={inputClass} />
        </FieldLabel>

        <FieldLabel label="Valor base (R$)" hint="Preço fixo dentro da faixa">
          <input type="number" step="0.01" value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })} className={inputClass} />
        </FieldLabel>

        <FieldLabel label="Mínimo (R$)" hint="Piso da entrega — nunca cobra menos">
          <input type="number" step="0.01" value={form.valor_minimo}
            onChange={(e) => setForm({ ...form, valor_minimo: e.target.value })} className={inputClass} />
        </FieldLabel>

        <FieldLabel label="R$ / km extra" hint="Adicional por km além da faixa">
          <input type="number" step="0.01" value={form.valor_por_km}
            onChange={(e) => setForm({ ...form, valor_por_km: e.target.value })} className={inputClass} />
        </FieldLabel>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-transparent select-none">.</span>
          <button
            disabled={saving}
            className="bg-gradient-red shadow-red text-primary-foreground font-bold uppercase tracking-wider rounded-md hover:opacity-90 flex items-center justify-center gap-2 px-4 py-2.5"
          >
            <Plus className="h-4 w-4" />
            {saving ? "..." : "Adicionar"}
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Cálculo: <span className="font-mono">total = max(mínimo, valor_base + km_excedente × R$/km)</span>.
      </p>
    </form>
  );
}
