import { useRouter, Link } from "@tanstack/react-router";
import { AlertTriangle, RotateCcw, Home, Radio } from "lucide-react";

interface GlobalErrorBoundaryProps {
  error?: Error;
  reset?: () => void;
  statusCode?: number;
  title?: string;
  description?: string;
}

export function GlobalErrorBoundary({
  error,
  reset,
  statusCode = 500,
  title,
  description,
}: GlobalErrorBoundaryProps) {
  const router = useRouter();

  const isNotFound = statusCode === 404;
  const displayTitle = title || (isNotFound ? "500" : "500");
  const displayDescription =
    description ||
    (isNotFound
      ? "A página que você procura não existe ou foi removida. Verifique o endereço ou volte para a estrada principal."
      : "Algo deu errado na nossa rota. Pode ser um problema temporário — tente recarregar ou volte para o início.");

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Shield / Icon */}
        <div className="mx-auto mb-8 inline-flex items-center justify-center w-24 h-24 rounded-none bg-gradient-red shadow-red relative overflow-hidden">
          <div className="absolute inset-0 bg-red-600 opacity-20 animate-pulse" />
          <AlertTriangle className="h-12 w-12 text-white relative z-10" strokeWidth={1.5} />
        </div>

        {/* Status code */}
        <div className="font-display text-8xl md:text-9xl text-red-600 mb-2 leading-none">
          500
        </div>

        {/* Title */}
        <h1 className="font-display text-3xl md:text-4xl tracking-[0.05em] mb-6 text-white uppercase">
          BURACO NO ASFALTO
        </h1>

        {/* Description */}
        <p className="text-white/60 text-base md:text-lg leading-relaxed mb-10 max-w-sm mx-auto">
          Algo deu errado na nossa rota. Pode ser um problema temporário — tente recarregar ou volte para o início.
        </p>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 w-full max-w-[280px] mx-auto">
          {reset && (
            <button
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="w-full inline-flex items-center justify-center gap-3 bg-red-600 px-6 py-4 rounded-none font-bold uppercase tracking-[0.15em] text-sm text-white hover:bg-red-700 transition-colors shadow-lg"
            >
              <RotateCcw className="h-4 w-4" />
              TENTAR NOVAMENTE
            </button>
          )}
          <Link
            to="/"
            className="w-full inline-flex items-center justify-center gap-3 border border-white/20 px-6 py-4 rounded-none font-bold uppercase tracking-[0.15em] text-sm text-white hover:bg-white/5 transition-colors"
          >
            <Home className="h-4 w-4" />
            VOLTAR PARA HOME
          </Link>
        </div>

        {/* Footer hint */}
        <div className="mt-20 text-[10px] text-white/30 uppercase tracking-[0.3em] font-medium">
          ROTA 66 — Entregas e Coletas
        </div>
      </div>
    </div>
  );
}
