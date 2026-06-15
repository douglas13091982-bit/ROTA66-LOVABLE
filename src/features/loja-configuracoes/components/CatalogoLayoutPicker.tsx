export function CatalogoLayoutPicker({
  value,
  onChange,
}: {
  value: "cards" | "lista";
  onChange: (v: "cards" | "lista") => void;
}) {
  const btn = (k: "cards" | "lista", label: string) => (
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
      <div className="font-bold uppercase tracking-wider text-sm mb-3">Layout do catálogo</div>
      <div className="flex gap-3">
        {btn("cards", "Cards")}
        {btn("lista", "Lista")}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">
        Escolha como os produtos aparecem no catálogo público.
      </p>
    </label>
  );
}
