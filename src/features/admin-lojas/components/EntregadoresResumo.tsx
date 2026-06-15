import { Bike, Circle } from "lucide-react";
import { useEntregadoresResumo } from "../hooks/use-entregadores";

export function EntregadoresResumo({ lojaId }: { lojaId: string }) {
  const { data } = useEntregadoresResumo(lojaId);
  const total = data?.total ?? 0;
  const online = data?.online ?? 0;
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Bike className="h-3 w-3" />
      <Circle
        className={`h-2 w-2 fill-current ${
          online > 0 ? "text-emerald-500" : "text-gray-500"
        }`}
      />
      <span>
        {online}/{total} entregadores online
      </span>
    </div>
  );
}
