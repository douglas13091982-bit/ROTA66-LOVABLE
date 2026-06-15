import { Link } from "@tanstack/react-router";
import { PlusCircle, Eye, EyeOff } from "lucide-react";

interface Props {
  slug?: string | null;
  mostrarArquivados: boolean;
  onToggleArquivados: () => void;
}

export function PedidosToolbar({ slug, mostrarArquivados, onToggleArquivados }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Link
        to="/loja/novo-pedido"
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-xs tracking-wider rounded-md hover:opacity-90"
      >
        <PlusCircle className="h-4 w-4" /> Novo Pedido
      </Link>
      {slug && (
        <a
          href={`/loja/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground underline truncate"
        >
          Link público: /loja/{slug}
        </a>
      )}
      <span className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[oklch(0.55_0.26_25)] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[oklch(0.55_0.26_25)]" />
        </span>
        Tempo real
      </span>
      <button
        onClick={onToggleArquivados}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted transition-colors"
      >
        {mostrarArquivados ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        {mostrarArquivados ? "Ocultar arquivados" : "Mostrar arquivados"}
      </button>
    </div>
  );
}
