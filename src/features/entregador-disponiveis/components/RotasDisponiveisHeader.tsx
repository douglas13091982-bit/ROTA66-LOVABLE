import { OrdenacaoToggle } from "./OrdenacaoToggle";
import type { OrdenacaoPedidos } from "../hooks/use-ordenacao-pedidos";

interface Props {
  ordenacao: OrdenacaoPedidos;
  onOrdenacaoChange: (v: OrdenacaoPedidos) => void;
}

export function RotasDisponiveisHeader({ ordenacao, onOrdenacaoChange }: Props) {
  return (
    <div className="max-w-xl mx-auto">
      <OrdenacaoToggle value={ordenacao} onChange={onOrdenacaoChange} />
    </div>
  );
}
