import { Package } from "lucide-react";
import { PedidoListItem } from "@/components/entregador/PedidoListItem";

interface Props {
  grupos: any[];
  isLoading: boolean;
  minhaPos: any;
  taxaSistema: any;
  taxaParaExibir: any;
  onAceitar: (items: any[]) => void;
}

export function RotasDisponiveisList({
  grupos,
  isLoading,
  minhaPos,
  taxaSistema,
  taxaParaExibir,
  onAceitar,
}: Props) {
  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xl font-bold text-white tracking-tight">Rotas Disponíveis</h2>
        <div
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ color: "oklch(0.72 0.18 27)" }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ background: "oklch(0.65 0.22 27)" }}
          />
          Em tempo real
        </div>
      </div>

      {isLoading && grupos.length === 0 && (
        <p className="text-white/45 text-sm px-1">Carregando pedidos...</p>
      )}

      {!isLoading && grupos.length === 0 && (
        <div className="text-center py-10 px-4 rounded-xl border border-white/5 bg-white/[0.02]">
          <Package className="h-10 w-10 text-white/30 mx-auto mb-3" />
          <p className="text-white/55 text-sm">Nenhum pedido disponível no momento.</p>
          <p className="text-white/35 text-xs mt-1">
            Assim que uma loja liberar, aparece aqui.
          </p>
        </div>
      )}

      {grupos.map((grupo) => (
        <PedidoListItem
          key={grupo.key}
          grupo={grupo}
          minhaPos={minhaPos}
          taxaSistema={taxaSistema}
          taxaParaExibir={taxaParaExibir}
          onAceitar={() => onAceitar(grupo.items)}
        />
      ))}
    </div>
  );
}
