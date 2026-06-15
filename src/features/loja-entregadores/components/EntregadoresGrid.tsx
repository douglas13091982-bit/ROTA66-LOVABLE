import type { Vinculo } from "../logic/types";
import { EntregadorCard } from "./EntregadorCard";

export function EntregadoresGrid({
  vinculos,
  onToggleAtivo,
  onRemove,
}: {
  vinculos: Vinculo[] | undefined;
  onToggleAtivo: (id: string, ativo: boolean) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {vinculos?.map((v) => (
        <EntregadorCard
          key={v.id}
          v={v}
          onToggleAtivo={() => onToggleAtivo(v.id, v.ativo)}
          onRemove={() => onRemove(v.id)}
        />
      ))}
      {vinculos && vinculos.length === 0 && (
        <p className="col-span-full text-center text-muted-foreground py-8">
          Nenhum entregador vinculado ainda.
        </p>
      )}
    </div>
  );
}
