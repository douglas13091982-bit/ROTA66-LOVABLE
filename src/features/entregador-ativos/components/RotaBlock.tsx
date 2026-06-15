import { norm } from "../logic/group";
import type { PedidoAtivo } from "../logic/types";
import { ColetaConsolidadaCard } from "./ColetaConsolidadaCard";
import { PedidoCard } from "./PedidoCard";

type Props = {
  items: PedidoAtivo[];
  destaque?: string;
};

export function RotaBlock({ items, destaque }: Props) {
  if (items.length === 1) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PedidoCard pedido={items[0]} destaque={destaque} />
      </div>
    );
  }

  const coletaRef = items[0];
  const mesmaColeta = items.every(
    (p) => norm(p.endereco_coleta) === norm(coletaRef.endereco_coleta),
  );

  const pendentesColeta = items.filter((p) => p.status === "em_rota");
  const pendentesEntrega = items.filter((p) => p.status === "coletado");

  // Fase 1: ainda há pedidos para coletar e todos compartilham o mesmo ponto de coleta
  if (mesmaColeta && pendentesColeta.length > 0) {
    return <ColetaConsolidadaCard pedidos={pendentesColeta} totalRota={items.length} />;
  }

  // Fase 2: já coletou tudo. Mostra entregas UMA por vez (a próxima na sequência).
  if (pendentesEntrega.length > 0) {
    const proxima = pendentesEntrega[0];
    const idxAtual = items.findIndex((p) => p.id === proxima.id);
    const restantes = pendentesEntrega.length;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between glass border border-border/40 rounded-xl px-4 py-2.5 text-[10px] uppercase tracking-[0.18em]">
          <span className="text-muted-foreground font-bold">
            Rota agrupada · {items.length} paradas
          </span>
          <span className="font-bold text-primary drop-shadow-[0_2px_8px_oklch(0.55_0.21_27_/_0.4)]">
            Entrega {idxAtual + 1}/{items.length} · faltam {restantes}
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="relative">
            <span className="absolute -top-2 -left-2 z-10 w-8 h-8 rounded-full bg-gradient-red text-primary-foreground font-display text-base flex items-center justify-center shadow-red border border-primary/40">
              {idxAtual + 1}
            </span>
            <PedidoCard pedido={proxima} destaque={destaque} agrupado />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
