import { OrdenacaoToggle } from "./OrdenacaoToggle";
import type { OrdenacaoPedidos } from "../hooks/use-ordenacao-pedidos";

interface Props {
  ordenacao: OrdenacaoPedidos;
  onOrdenacaoChange: (v: OrdenacaoPedidos) => void;
}

export function RotasDisponiveisHeader({ ordenacao, onOrdenacaoChange }: Props) {
  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-4 px-1">
        <h2 className="text-[18px] font-extrabold leading-[1.05] tracking-tight text-white whitespace-nowrap">
          Rotas Disponíveis
        </h2>
      </div>
      <OrdenacaoToggle value={ordenacao} onChange={onOrdenacaoChange} />
    </div>
  );
}
