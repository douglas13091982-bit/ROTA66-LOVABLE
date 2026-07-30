import { Minus, Plus } from "lucide-react";

export function QtyStepper({
  qtd,
  onAdd,
  onRemove,
  size = "md",
}: {
  qtd: number;
  onAdd: () => void;
  onRemove: () => void;
  size?: "sm" | "md";
}) {
  const isSm = size === "sm";
  const btn = isSm ? "h-8 w-8" : "h-10 w-10";
  const icon = isSm ? "h-3.5 w-3.5" : "h-4 w-4";
  const num = isSm ? "min-w-[18px] text-xs" : "min-w-[22px] text-sm";
  return (
    <div className="flex items-center bg-card border border-border rounded-full shadow-sm">
      <button
        onClick={onRemove}
        aria-label="Diminuir"
        className={`${btn} flex items-center justify-center text-primary active:scale-95 transition`}
      >
        <Minus className={icon} />
      </button>
      <span className={`px-1 ${num} text-center font-bold tabular-nums`}>{qtd}</span>
      <button
        onClick={onAdd}
        aria-label="Adicionar"
        className={`${btn} flex items-center justify-center text-primary active:scale-95 transition`}
      >
        <Plus className={icon} />
      </button>
    </div>
  );
}

export function AddButton({ onAdd, size = "md" }: { onAdd: () => void; size?: "sm" | "md" }) {
  const isSm = size === "sm";
  return (
    <button
      onClick={onAdd}
      aria-label="Adicionar ao carrinho"
      className={`cc-cta ${isSm ? "h-9 w-9" : "h-12 w-12"} flex items-center justify-center rounded-full`}
    >
      <Plus className={isSm ? "h-4 w-4" : "h-6 w-6"} strokeWidth={2.5} />
    </button>
  );
}
