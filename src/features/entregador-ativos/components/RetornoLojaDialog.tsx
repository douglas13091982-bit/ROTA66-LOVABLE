import { useSyncExternalStore } from "react";
import { CreditCard, MapPin, Navigation, Store } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Payload = { endereco: string } | null;
let current: Payload = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function abrirRetornoLoja(endereco: string) {
  current = { endereco };
  emit();
}

function fechar() {
  current = null;
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function getSnapshot() {
  return current;
}

export function RetornoLojaDialog() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const open = !!state;
  const endereco = state?.endereco ?? "";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) fechar(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-400" />
            Volte para a loja com a maquininha
          </DialogTitle>
          <DialogDescription>
            Pagamento em cartão — devolva a maquininha à loja para concluir o recebimento.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-background/40 backdrop-blur-sm p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold mb-1.5 flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5" /> Endereço da loja
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span className="font-semibold text-sm">{endereco}</span>
            </div>
          </div>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}`}
            className="w-full px-5 py-4 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-sm tracking-[0.18em] rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <Navigation className="h-5 w-5" /> Abrir rota de volta
          </a>
          <button
            onClick={fechar}
            className="w-full px-5 py-3 rounded-xl border border-border/60 bg-background/40 backdrop-blur-sm font-bold uppercase text-xs tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors"
          >
            Já entreguei a maquininha
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
