import { ShoppingBag } from "lucide-react";

export function StickyCartBar({
  totalItens,
  subtotal,
  onOpen,
}: {
  totalItens: number;
  subtotal: number;
  onOpen: () => void;
}) {
  if (totalItens === 0) return null;
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] cc-glass border-t border-border/60">
      <button
        onClick={onOpen}
        className="cc-cta w-full max-w-2xl mx-auto flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl font-semibold uppercase text-[12px] tracking-[0.18em]"
      >
        <span className="flex items-center gap-3">
          <span className="relative inline-flex items-center justify-center h-9 w-9 rounded-xl bg-white/15 ring-1 ring-white/20">
            <ShoppingBag className="h-4 w-4" />
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-white text-primary text-[10px] font-bold flex items-center justify-center tabular-nums shadow-md">
              {totalItens}
            </span>
          </span>
          <span>Ver carrinho</span>
        </span>
        <span className="cc-price text-[17px] normal-case tracking-tight">R$ {subtotal.toFixed(2)}</span>
      </button>
    </div>
  );
}
