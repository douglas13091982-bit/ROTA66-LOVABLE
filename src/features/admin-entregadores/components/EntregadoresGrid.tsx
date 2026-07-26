import { Component, type ReactNode } from "react";
import { EntregadorCard } from "./EntregadorCard";
import type { EntregadorRow, StatusEntregador } from "../logic/types";

class CardBoundary extends Component<{ children: ReactNode }, { erro: boolean }> {
  state = { erro: false };
  static getDerivedStateFromError() {
    return { erro: true };
  }
  render() {
    if (this.state.erro) {
      return (
        <div className="bg-card border border-border rounded-lg p-5 text-sm text-muted-foreground">
          Não foi possível exibir este entregador.
        </div>
      );
    }
    return this.props.children;
  }
}

export function EntregadoresGrid({
  list,
  isLoading,
  onSetStatus,
  onRemove,
}: {
  list: EntregadorRow[];
  isLoading: boolean;
  onSetStatus: (id: string, status: StatusEntregador) => void;
  onRemove: (id: string, nome: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map((p) => (
        <CardBoundary key={p.id}>
          <EntregadorCard
            p={p}
            onSetStatus={onSetStatus}
            onRemove={onRemove}
          />
        </CardBoundary>
      ))}
      {list.length === 0 && !isLoading && (
        <p className="col-span-full text-center text-muted-foreground py-8">
          Nenhum entregador no filtro.
        </p>
      )}
    </div>
  );
}
