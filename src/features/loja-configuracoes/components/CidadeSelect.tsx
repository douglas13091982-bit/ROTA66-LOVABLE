import { useCidades } from "@/hooks/use-cidades";

export function CidadeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { cidades } = useCidades();
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
        Cidade <span className="text-red-500">*</span>
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full bg-background border border-border rounded-md px-4 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      >
        <option value="">Selecione a cidade…</option>
        {cidades.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome} / {c.uf}
          </option>
        ))}
      </select>
      {!value && (
        <span className="block text-[11px] text-amber-600 mt-1">
          Obrigatório — sem cidade a loja não aparece para o franqueado.
        </span>
      )}
    </label>
  );
}
