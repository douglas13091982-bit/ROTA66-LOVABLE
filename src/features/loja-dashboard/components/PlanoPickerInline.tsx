import { Star, Check } from "lucide-react";
import { usePlanosDisponiveis } from "../hooks/use-planos-disponiveis";

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function PlanoPickerInline({ selectedId, onSelect }: Props) {
  const { data, isLoading } = usePlanosDisponiveis();

  if (isLoading) {
    return <div className="text-sm text-white/60">Carregando planos...</div>;
  }
  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-white/70 bg-white/[0.03] border border-white/10 rounded-lg p-4">
        Nenhum plano configurado pelo administrador. Continue — sua loja será criada e o admin
        poderá atribuir um plano depois.
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {data.map((p) => {
        const selected = selectedId === p.id;
        return (
          <button
            type="button"
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`text-left rounded-xl p-4 border transition relative ${
              selected
                ? "border-yellow-500/70 bg-yellow-500/5"
                : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
            }`}
          >
            {p.destaque && (
              <span className="absolute -top-2 left-4 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-500 text-black">
                <Star className="h-3 w-3 fill-black" />
                Recomendado
              </span>
            )}
            {selected && (
              <span className="absolute top-3 right-3 h-6 w-6 grid place-items-center rounded-full bg-yellow-500 text-black">
                <Check className="h-4 w-4" />
              </span>
            )}
            <div className="font-semibold text-white mb-1">{p.nome}</div>
            {p.descricao && (
              <div className="text-xs text-white/60 mb-3 line-clamp-2">{p.descricao}</div>
            )}
            <div className="text-sm space-y-0.5">
              <div className="text-white">
                <span className="text-white/55 text-xs">Mensalidade: </span>
                <span className="font-bold">R$ {Number(p.mensalidade_valor).toFixed(2)}</span>
              </div>
              <div className="text-white">
                <span className="text-white/55 text-xs">Por pedido: </span>
                <span className="font-bold">
                  {Number(p.taxa_por_pedido) === 0
                    ? "Isento"
                    : `R$ ${Number(p.taxa_por_pedido).toFixed(2)}`}
                </span>
              </div>
              <div className="text-white/50 text-[11px] pt-1">
                Vencimento dia {p.dia_vencimento}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
