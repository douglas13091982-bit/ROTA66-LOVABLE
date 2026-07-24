import { useSyncExternalStore } from "react";
import { CreditCard, MapPin, Navigation, Store, X } from "lucide-react";

const STORAGE_KEY = "retorno-loja-endereco";

export type RetornoLojaPayload = {
  endereco: string;
  pedidoId?: string;
  numero?: string | number;
};

type Payload = RetornoLojaPayload | null;

function parsePayload(raw: string | null): Payload {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RetornoLojaPayload;
    return parsed?.endereco ? parsed : null;
  } catch {
    return { endereco: raw };
  }
}

function readInitial(): Payload {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return parsePayload(raw);
  } catch {
    return null;
  }
}

let current: Payload = readInitial();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function lerRetornoLojaSalvo() {
  return current;
}

export function useRetornoLojaSalvo() {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}


export function abrirRetornoLoja(endereco: string, pedidoId?: string, numero?: string | number) {
  current = { endereco, pedidoId, numero };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {}
  emit();
}

function fechar() {
  current = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
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
  if (!state) return null;
  const endereco = state.endereco;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in-0"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md rounded-2xl glass border border-border/40 shadow-elevated p-6 space-y-4 animate-in slide-in-from-bottom-4">
        <button
          onClick={fechar}
          aria-label="Fechar"
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold text-gray-700">Volte para a loja com a maquininha</h2>
          </div>
          {state.numero && (
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300 mb-2">
              Pedido #{state.numero}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Pagamento em cartão — devolva a maquininha à loja para concluir o recebimento.
          </p>
        </div>

        <div className="rounded-xl border border-border/40 bg-background/40 backdrop-blur-sm p-3">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold mb-1.5 flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5" /> Endereço da loja
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <span className="font-semibold text-sm text-gray-500">{endereco}</span>
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
    </div>
  );
}
