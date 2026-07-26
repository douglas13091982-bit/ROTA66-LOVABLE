export function CatalogoStatusInicialPicker({
  value,
  onChange,
}: {
  value: "em_preparo" | "pronto";
  onChange: (v: "em_preparo" | "pronto") => void;
}) {
  const btn = (k: "em_preparo" | "pronto", label: string) => (
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
        Pedidos do catálogo entram em
      </div>
      <div className="flex gap-3">
        {btn("em_preparo", "Em preparo")}
        {btn("pronto", "Pronto")}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        Em "Pronto" o pedido já é liberado para os entregadores assim que entra,
        agilizando a coleta. Em "Em preparo" você libera manualmente.
      </p>
    </label>
  );
}
