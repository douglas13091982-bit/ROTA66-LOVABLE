import { Trash2 } from "lucide-react";
import type { TarifaRow } from "../logic/types";

export function TarifasTable({
  tarifas,
  onToggle,
  onRemove,
}: {
  tarifas: TarifaRow[];
  onToggle: (id: string, ativa: boolean) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-lg shadow-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-background">
          <tr className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <th className="text-left p-4">Faixa (km)</th>
            <th className="text-left p-4">Base</th>
            <th className="text-left p-4">Mínimo</th>
            <th className="text-left p-4">R$/km</th>
            <th className="text-left p-4">Status</th>
            <th className="p-4"></th>
          </tr>
        </thead>
        <tbody>
          {tarifas.map((t) => (
            <tr key={t.id} className="border-t border-border">

              <td className="p-4">{t.faixa_km_min} – {t.faixa_km_max} km</td>
              <td className="p-4 text-primary font-bold">R$ {Number(t.valor).toFixed(2)}</td>
              <td className="p-4">R$ {Number(t.valor_minimo ?? 0).toFixed(2)}</td>
              <td className="p-4">R$ {Number(t.valor_por_km ?? 0).toFixed(2)}</td>
              <td className="p-4">
                <button
                  onClick={() => onToggle(t.id, t.ativa)}
                  className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md ${t.ativa ? "bg-green-600/20 text-green-500" : "bg-zinc-600/20 text-zinc-400"}`}
                >
                  {t.ativa ? "Ativa" : "Inativa"}
                </button>
              </td>
              <td className="p-4 text-right">
                <button onClick={() => onRemove(t.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
          {tarifas.length === 0 && (
            <tr>
              <td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma tarifa cadastrada.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
