import type { PedidoRow as PedidoRowType } from "../logic/types";
import { PedidoRow } from "./PedidoRow";

export function PedidosTable({ pedidos }: { pedidos: PedidoRowType[] }) {
  return (
    <div className="bg-card border border-border rounded-lg shadow-card overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead className="bg-background">
          <tr className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <th className="text-left p-4">#</th>
            <th className="text-left p-4">Loja</th>
            <th className="text-left p-4">Cliente</th>
            <th className="text-left p-4">Total</th>
            <th className="text-left p-4">Entregador</th>
            <th className="text-left p-4">Status</th>
            <th className="text-left p-4">Data</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((p) => (
            <PedidoRow key={p.id} pedido={p} />
          ))}
          {pedidos.length === 0 && (
            <tr>
              <td colSpan={7} className="p-8 text-center text-muted-foreground">
                Nenhum pedido ainda.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
