import { EntregadorNomeBadge } from "@/components/EntregadorNomeBadge";
import { formatDateTime } from "@/lib/format";
import type { PedidoRow as PedidoRowType } from "../logic/types";
import { StatusBadge } from "./StatusBadge";

export function PedidoRow({ pedido }: { pedido: PedidoRowType }) {
  return (
    <tr className="border-t border-border">
      <td className="p-4 font-display text-lg">#{pedido.numero}</td>
      <td className="p-4">{pedido.lojas?.nome ?? "—"}</td>
      <td className="p-4">{pedido.cliente_nome}</td>
      <td className="p-4 text-primary font-bold">R$ {Number(pedido.valor_total).toFixed(2)}</td>
      <td className="p-4">
        {pedido.entregador_id ? (
          <EntregadorNomeBadge pedidoId={pedido.id} entregadorId={pedido.entregador_id} />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </td>
      <td className="p-4">
        <StatusBadge status={pedido.status} />
      </td>
      <td className="p-4 text-muted-foreground text-sm">{formatDateTime(pedido.created_at)}</td>
    </tr>
  );
}
