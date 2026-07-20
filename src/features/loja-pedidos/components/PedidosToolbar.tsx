import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PlusCircle, Eye, EyeOff, Volume2, VolumeX } from "lucide-react";
import {
  isNotificacaoMutada,
  setNotificacaoMutada,
  pararNotificacao,
} from "@/lib/notificacao-som";
import { BonusEntregadorToggle } from "./BonusEntregadorToggle";

interface Props {
  slug?: string | null;
  lojaId?: string;
  bonusAtivo?: boolean;
  bonusValor?: number;
  mostrarArquivados: boolean;
  onToggleArquivados: () => void;
}

export function PedidosToolbar({
  slug,
  lojaId,
  bonusAtivo = false,
  bonusValor = 0,
  mostrarArquivados,
  onToggleArquivados,
}: Props) {
  const [mutado, setMutado] = useState<boolean>(() => isNotificacaoMutada());

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as { mutado?: boolean } | undefined;
      setMutado(!!detail?.mutado);
    };
    window.addEventListener("notificacao-som:mute-changed", onChange);
    return () => window.removeEventListener("notificacao-som:mute-changed", onChange);
  }, []);

  const toggleMute = () => {
    const novo = !mutado;
    setMutado(novo);
    setNotificacaoMutada(novo);
    if (novo) pararNotificacao();
  };

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
        onClick={toggleMute}
        title={mutado ? "Som silenciado — clique para reativar" : "Silenciar som de novos pedidos"}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md transition-colors ${
          mutado
            ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            : "border-border hover:bg-muted"
        }`}
      >
        {mutado ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        {mutado ? "Som silenciado" : "Silenciar som"}
      </button>
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
