import { PartyPopper, X } from "lucide-react";

type Props = {
  count: number;
  totalGanho: number;
  onDismiss: () => void;
};

export function FinalizadoBanner({ count, totalGanho, onDismiss }: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl glass shadow-elevated p-8 text-center mb-6 border border-emerald-500/40">
      <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-emerald-500/25 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
      <button
        onClick={onDismiss}
        aria-label="Fechar"
        className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-card/60 transition z-10"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="relative flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center backdrop-blur-sm border border-emerald-400/40 shadow-[0_10px_30px_-8px_oklch(0.7_0.18_155_/_0.5)]">
          <PartyPopper className="h-8 w-8 text-emerald-400" />
        </div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-bold">
          Entregas Finalizadas
        </div>
        <div className="text-sm text-muted-foreground">
          {count} {count === 1 ? "entrega concluída" : "entregas concluídas"}
        </div>
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">
            Você ganhou
          </div>
          <div className="font-display text-6xl md:text-7xl text-emerald-400 leading-none drop-shadow-[0_4px_24px_oklch(0.7_0.18_155_/_0.45)]">
            R$ {totalGanho.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
