import { History } from "lucide-react";
import type { Periodo } from "../logic/types";

export function VazioHistorico({ periodo }: { periodo: Periodo }) {
  return (
    <div className="p-12 text-center">
      <History className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
      <p className="font-display text-2xl tracking-[0.06em]">
        Sem entregas {periodo === "semanal" ? "nesta semana" : "neste período"}
      </p>
    </div>
  );
}
