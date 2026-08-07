import { PartyPopper, X, Store, Navigation, MapPin } from "lucide-react";

type Props = {
  count: number;
  totalGanho: number;
  onDismiss: () => void;
  retornoPendente?: {
    endereco: string;
    numero?: string | number;
  } | null;
};

export function FinalizadoBanner({ count, totalGanho, onDismiss, retornoPendente }: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-elevated p-8 text-center mb-6 border border-emerald-500/40">
      <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-emerald-500/25 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
      <button
        onClick={onDismiss}
        aria-label="Fechar"
        className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-gray-100 transition z-10"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="relative flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-400/20 shadow-sm">
          <PartyPopper className="h-8 w-8 text-emerald-400" />
        </div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-bold">
          {retornoPendente ? "Entrega Pendente de Retorno" : "Entregas Finalizadas"}
        </div>
        <div className="text-sm text-muted-foreground">
          {retornoPendente ? "Devolva a maquininha para concluir" : `${count} ${count === 1 ? "entrega concluída" : "entregas concluídas"}`}
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
      {retornoPendente && (
        <div className="mt-8 pt-8 border-t border-emerald-500/20 text-left space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <Store className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#e3000f] uppercase tracking-wider">
                Devolução da Maquininha
              </h3>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
                Retorno Obrigatório à Loja
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-gray-50 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 mt-0.5 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">
                  Endereço da Loja
                </span>
                <span className="font-bold text-sm text-navy block leading-snug">
                  {retornoPendente.endereco}
                </span>
              </div>
            </div>

            <a
              target="_blank"
              rel="noopener noreferrer"
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(retornoPendente.endereco)}`}
              className="w-full px-5 py-4 bg-[#e3000f] shadow-[0_8px_20px_-4px_rgba(227,0,15,0.4)] text-white font-bold uppercase text-[11px] tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Navigation className="h-4 w-4" /> Abrir GPS de Volta
            </a>
          </div>

          <p className="text-[11px] text-center text-muted-foreground/80 italic">
            O pedido #{retornoPendente.numero} foi pago com cartão. Devolva a maquininha para finalizar.
          </p>
        </div>
      )}
    </div>
  );
}
