import { ShoppingBag } from "lucide-react";

export function StickyCartBar({
  totalItens,
  subtotal,
  onOpen,
  offsetNav = false,
}: {
  totalItens: number;
  subtotal: number;
  onOpen: () => void;
  offsetNav?: boolean;
}) {
  if (totalItens === 0) return null;
  return (
    <div
      className="fixed inset-x-0 z-40 px-3"
      style={{
        bottom: offsetNav
          ? "calc(env(safe-area-inset-bottom) + 4.75rem)"
          : "calc(env(safe-area-inset-bottom) + 0.75rem)",
      }}
    >
      <div className="cc-card max-w-2xl mx-auto rounded-2xl p-2.5 flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
            {totalItens}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="cc-price text-[19px] leading-none cc-ink-text">
            R$ {formatCurrencyValue(subtotal)}
          </div>
          <div className="text-[12px] text-muted-foreground mt-0.5">Ver sacola</div>
        </div>
        <button
          onClick={onOpen}
          className="cc-cta shrink-0 px-5 py-3.5 rounded-xl font-bold uppercase text-[12px] tracking-[0.14em]"
        >
          Ver sacola
        </button>
      </div>
    </div>
  );
}
