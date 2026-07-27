import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PlusCircle, Eye, EyeOff, Volume2, VolumeX, Link2 } from "lucide-react";
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

const CARD =
  "flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm font-medium transition-colors hover:bg-muted/50 md:rounded-md md:py-1.5 md:text-xs";

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
    <div className="mb-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center md:gap-3">
      <Link
        to="/loja/novo-pedido"
        className="flex items-center justify-center gap-2 rounded-xl bg-gradient-red shadow-red px-4 py-3.5 text-primary-foreground font-bold uppercase text-sm tracking-wider hover:opacity-90 md:rounded-md md:py-2.5 md:text-xs"
      >
        <PlusCircle className="h-5 w-5 md:h-4 md:w-4" /> Novo Pedido
      </Link>

      {slug ? (
        <a
          href={`/loja/${slug}`}
          target="_blank"
          rel="noreferrer"
          className={`${CARD} text-muted-foreground hover:text-foreground`}
        >
          <Link2 className="h-4 w-4 shrink-0" />
          <span className="truncate">Link público</span>
        </a>
      ) : (
        <span className="hidden md:block" />
      )}

      {lojaId && (
        <BonusEntregadorToggle
          lojaId={lojaId}
          initialAtivo={bonusAtivo}
          initialValor={bonusValor}
        />
      )}

      <span className="flex flex-col justify-center gap-0.5 rounded-xl border border-border bg-muted/30 px-3 py-2.5 md:order-last md:ml-auto md:border-0 md:bg-transparent md:px-0 md:py-0">
        <span className="flex items-center gap-2 text-sm font-semibold md:text-xs md:font-normal md:text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[oklch(0.55_0.26_25)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[oklch(0.55_0.26_25)]" />
          </span>
          Tempo real
        </span>
        <span className="text-xs text-muted-foreground md:hidden">Atualizado agora há pouco</span>
      </span>

      <button
        onClick={toggleMute}
        title={mutado ? "Som silenciado — clique para reativar" : "Silenciar som de novos pedidos"}
        className={`${CARD} ${
          mutado
            ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            : ""
        }`}
      >
        {mutado ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        {mutado ? "Som silenciado" : "Silenciar som"}
      </button>

      <button onClick={onToggleArquivados} className={CARD}>
        {mostrarArquivados ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        {mostrarArquivados ? "Ocultar arquivados" : "Mostrar arquivados"}
      </button>
    </div>
  );
}
