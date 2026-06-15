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
  const displayTitle = title || (isNotFound ? "ROTA NÃO ENCONTRADA" : "BURACO NO ASFALTO");
  const displayDescription =
    description ||
    (isNotFound
      ? "A página que você procura não existe ou foi removida. Verifique o endereço ou volte para a estrada principal."
      : "Algo deu errado na nossa rota. Pode ser um problema temporário — tente recarregar ou volte para o início.");

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Shield / Icon */}
        <div className="mx-auto mb-8 inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-red shadow-red">
          {isNotFound ? (
            <Radio className="h-12 w-12 text-primary-foreground" strokeWidth={1.5} />
          ) : (
            <AlertTriangle className="h-12 w-12 text-primary-foreground" strokeWidth={1.5} />
          )}
        </div>

        {/* Status code */}
        <div className="font-display text-7xl md:text-8xl text-gradient-red mb-2">
          {statusCode}
        </div>

        {/* Title */}
        <h1 className="font-display text-3xl md:text-4xl tracking-wide mb-4">
          {displayTitle}
        </h1>

        {/* Description */}
        <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8">
          {displayDescription}
        </p>

        {/* Error detail (dev only) */}
        {error && import.meta.env.DEV && (
          <div className="mb-8 text-left">
            <details className="group">
              <summary className="cursor-pointer text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2 select-none">
                Detalhes técnicos
              </summary>
              <pre className="mt-2 text-xs bg-card border border-border rounded-md p-4 overflow-auto text-muted-foreground">
                {error.message}
                {"\n\n"}
                {error.stack}
              </pre>
            </details>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap justify-center gap-3">
          {reset && (
            <button
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="inline-flex items-center gap-2 bg-gradient-red shadow-red px-6 py-3 rounded-md font-bold uppercase tracking-wider text-sm text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <RotateCcw className="h-4 w-4" />
              Tentar novamente
            </button>
          )}
          <Link
            to="/"
            className="inline-flex items-center gap-2 border-2 border-foreground/20 px-6 py-3 rounded-md font-bold uppercase tracking-wider text-sm hover:border-primary hover:text-primary transition-colors"
          >
            <Home className="h-4 w-4" />
            Voltar para home
          </Link>
        </div>

        {/* Footer hint */}
        <div className="mt-12 text-xs text-muted-foreground uppercase tracking-widest">
          ROTA 66 — Entregas e Coletas
        </div>
      </div>
    </div>
  );
}
