import { agruparPorDia } from "../logic/helpers";
import type { PedidoHistorico } from "../logic/types";
import { EntregaRow } from "./EntregaRow";

export function EntregasList({
  listagem,
  taxaSistema,
}: {
  listagem: PedidoHistorico[];
  taxaSistema: number;
}) {
  const groups = agruparPorDia(listagem);

  return (
    <div className="overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">
          Entregas concluídas
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {listagem.length} {listagem.length === 1 ? "registro" : "registros"}
        </span>
      </div>
      {groups.map((g) => (
        <div key={g.label}>
          <div className="px-4 pt-4 pb-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">
            {g.label}
          </div>
          {g.items.map((p) => (
            <EntregaRow key={p.id} pedido={p} taxaSistema={taxaSistema} />
          ))}
        </div>
      ))}
    </div>
  );
}
