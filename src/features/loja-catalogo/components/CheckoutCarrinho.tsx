import { Minus, Plus, Trash2 } from "lucide-react";
import type { CartItem } from "../hooks/use-cart";

type Props = {
  cartItems: CartItem[];
  subtotal: number;
  taxa: number;
  total: number;
  onInc: (lineId: string) => void;
  onDec: (lineId: string) => void;
  onRemove: (lineId: string) => void;
};

export function CheckoutCarrinho({ cartItems, subtotal, taxa, total, onInc, onDec, onRemove }: Props) {
  return (
    <>
      <div className="space-y-2">
        {cartItems.map((i) => (
          <div key={i.lineId} className="flex items-start gap-3 bg-background rounded-xl p-2.5">
            {i.produto.imagem_url ? (
              <img
                src={i.produto.imagem_url}
                alt={i.produto.nome}
                className="h-14 w-14 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-card shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-foreground tracking-tight truncate">
                  {i.produto.nome}
                </div>
                <button
                  onClick={() => onRemove(i.lineId)}
                  className="text-muted-foreground hover:text-red-500 shrink-0"
                  aria-label="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {i.adicionais.length > 0 && (
                <ul className="mt-0.5 text-[11px] text-muted-foreground">
                  {i.adicionais.map((a) => (
                    <li key={a.opcao_id} className="truncate">
                      + {a.nome}
                      {a.preco > 0 ? ` (R$ ${a.preco.toFixed(2)})` : ""}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="text-xs text-primary cc-price">
                  R$ {(i.precoUnit * i.qtd).toFixed(2)}
                </div>
                <div className="flex items-center bg-card border border-border rounded-full">
                  <button onClick={() => onDec(i.lineId)} className="h-8 w-8 flex items-center justify-center text-primary">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-1 min-w-[20px] text-center text-sm font-bold tabular-nums">{i.qtd}</span>
                  <button onClick={() => onInc(i.lineId)} className="h-8 w-8 flex items-center justify-center text-primary">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-background rounded-xl p-3 space-y-1 text-sm">
        <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between text-muted-foreground"><span>Entrega</span><span>R$ {taxa.toFixed(2)}</span></div>
        <div className="flex justify-between font-bold pt-1.5 border-t border-border mt-1.5 text-foreground">
          <span>Total</span>
          <span className="text-primary cc-price text-xl">R$ {total.toFixed(2)}</span>
        </div>
      </div>
    </>
  );
}
