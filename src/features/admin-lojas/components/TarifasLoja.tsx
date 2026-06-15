import { Trash2 } from "lucide-react";
import { useTarifasLoja } from "../hooks/use-tarifas-loja";

export function TarifasLoja({ lojaId }: { lojaId: string }) {
  const { data, isLoading, form, setForm, saving, add, remove, toggle } =
    useTarifasLoja(lojaId);

  return (
    <div className="mt-3 p-3 bg-background border border-border rounded-md">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
        Tarifas desta loja (moto)
      </div>
      <form onSubmit={add} className="grid grid-cols-5 gap-1.5 mb-2">
        <TarifaField
          label="KM mín"
          hint="Início da faixa"
          value={form.faixa_km_min}
          onChange={(v) => setForm({ ...form, faixa_km_min: v })}
          step="0.1"
        />
        <TarifaField
          label="KM máx"
          hint="Fim da faixa"
          value={form.faixa_km_max}
          onChange={(v) => setForm({ ...form, faixa_km_max: v })}
          step="0.1"
        />
        <TarifaField
          label="Base (R$)"
          hint="Preço fixo da faixa"
          value={form.valor}
          onChange={(v) => setForm({ ...form, valor: v })}
        />
        <TarifaField
          label="Mínimo (R$)"
          hint="Nunca cobra menos"
          value={form.valor_minimo}
          onChange={(v) => setForm({ ...form, valor_minimo: v })}
        />
        <TarifaField
          label="R$/km extra"
          hint="Adicional além da faixa"
          value={form.valor_por_km}
          onChange={(v) => setForm({ ...form, valor_por_km: v })}
        />
        <button
          disabled={saving}
          className="col-span-5 px-2 py-1.5 bg-primary/10 text-primary text-[10px] font-bold uppercase rounded hover:bg-primary/20 disabled:opacity-40"
        >
          {saving ? "..." : "+ Adicionar faixa"}
        </button>
        <p className="col-span-5 text-[9px] text-muted-foreground font-mono leading-tight">
          total = max(mínimo, base + km_excedente × R$/km)
        </p>
      </form>
      {isLoading ? (
        <p className="text-[10px] text-muted-foreground">Carregando...</p>
      ) : !data || data.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">
          Nenhuma tarifa. A loja usará as tarifas globais.
        </p>
      ) : (
        <div className="space-y-1">
          {data.map((t: any) => (
            <div
              key={t.id}
              className="flex items-center justify-between text-[11px] bg-card border border-border rounded px-2 py-1"
            >
              <span>
                {t.faixa_km_min}–{t.faixa_km_max} km · R${" "}
                {Number(t.valor).toFixed(2)} (min {Number(t.valor_minimo).toFixed(2)} ·{" "}
                {Number(t.valor_por_km).toFixed(2)}/km)
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggle(t.id, t.ativa)}
                  className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${
                    t.ativa
                      ? "bg-green-600/20 text-green-500"
                      : "bg-zinc-600/20 text-zinc-400"
                  }`}
                >
                  {t.ativa ? "ON" : "OFF"}
                </button>
                <button
                  onClick={() => remove(t.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TarifaField({
  label,
  hint,
  value,
  onChange,
  step = "0.01",
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-1.5 py-1 bg-card border border-border rounded text-[11px]"
      />
      <span className="text-[9px] text-muted-foreground leading-tight">{hint}</span>
    </label>
  );
}
