import { EntregadorCard } from "./EntregadorCard";
import type { EntregadorRow, StatusEntregador } from "../logic/types";

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
        <EntregadorCard
          key={p.id}
          p={p}
          onSetStatus={onSetStatus}
          onRemove={onRemove}
        />
      ))}
      {list.length === 0 && !isLoading && (
        <p className="col-span-full text-center text-muted-foreground py-8">
          Nenhum entregador no filtro.
        </p>
      )}
    </div>
  );
}
