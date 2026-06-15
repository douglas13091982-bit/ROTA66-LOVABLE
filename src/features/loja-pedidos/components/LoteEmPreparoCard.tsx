import { Layers, CheckCheck } from "lucide-react";
import type { LoteEmPreparo } from "../logic/agrupador";

interface Props {
  lote: LoteEmPreparo;
  onMarcarTodosProntos: (ids: string[]) => void;
}

export function LoteEmPreparoCard({ lote, onMarcarTodosProntos }: Props) {
  const handleClick = () => {
    if (window.confirm(`Marcar ${lote.ids.length} pedidos como prontos?`)) {
      onMarcarTodosProntos(lote.ids);
    }
  };

  return (
    <div className="border border-[oklch(0.55_0.16_75_/_0.40)] bg-[oklch(0.55_0.16_75_/_0.10)] rounded-md p-2 space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[oklch(0.75_0.12_75)]">
        <Layers className="h-3 w-3" />
        Lote · {lote.items.length} entregas próximas
        {lote.raioKm > 0 && (
          <span className="font-normal normal-case text-muted-foreground">
            (~{lote.raioKm.toFixed(1)} km entre si)
          </span>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground truncate">
        {lote.items.map((p: any) => `#${p.numero}`).join(" · ")}
      </div>
      <button
        onClick={handleClick}
        className="w-full inline-flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[oklch(0.55_0.26_25)] hover:bg-[oklch(0.48_0.24_25)] text-white font-bold uppercase text-[10px] tracking-wider rounded"
      >
        <CheckCheck className="h-3 w-3" /> Marcar todos como pronto
      </button>
    </div>
  );
}
