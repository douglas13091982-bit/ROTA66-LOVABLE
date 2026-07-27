export function RetiradaBalcaoToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const btn = (k: boolean, label: string) => (
    <button
      type="button"
      onClick={() => onChange(k)}
      className={`flex-1 px-4 py-3 rounded-md border text-xs font-bold uppercase tracking-wider transition ${
        value === k
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background border-border text-muted-foreground hover:border-primary/40"
      }`}
    >
      {label}
    </button>
  );

  return (
    <label className="block p-4 bg-background rounded-md border border-border">
      <div className="font-bold uppercase tracking-wider text-sm mb-3">
        Retirada no balcão
      </div>
      <div className="flex gap-3">
        {btn(true, "Permitir")}
        {btn(false, "Só entrega")}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        Quando permitido, o cliente escolhe no cardápio digital entre receber em
        casa ou retirar no balcão. Pedidos de retirada não têm frete e não são
        enviados aos entregadores.
      </p>
    </label>
  );
}
