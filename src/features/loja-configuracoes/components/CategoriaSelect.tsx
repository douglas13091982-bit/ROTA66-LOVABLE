import { LOJA_CATEGORIAS, type LojaCategoria } from "@/lib/loja-categorias";

export function CategoriaSelect({
  value,
  onChange,
}: {
  value: LojaCategoria | "";
  onChange: (v: LojaCategoria | "") => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
        Categoria de atuação
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as LojaCategoria | "")}
        className="w-full bg-background border border-border rounded-md px-4 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      >
        <option value="">Selecione...</option>
        {LOJA_CATEGORIAS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
    </label>
  );
}
