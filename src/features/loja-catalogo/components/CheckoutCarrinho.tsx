import type { Produto } from "@/routes/-catalogo-types";
import { Minus, Plus } from "lucide-react";

type Props = {
  cartItems: { produto: Produto; qtd: number }[];
  subtotal: number;
  taxa: number;
  total: number;
  addItem: (id: string) => void;
  removeItem: (id: string) => void;
};

export function CheckoutCarrinho({ cartItems, subtotal, taxa, total, addItem, removeItem }: Props) {
  return (
    <>
      <div className="space-y-2">
        {cartItems.map((i) => (
          <div key={i.produto.id} className="flex items-center gap-3 bg-background rounded-xl p-2.5">
            {i.produto.imagem_url ? (
              <img src={i.produto.imagem_url} alt={i.produto.nome} className="h-14 w-14 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-card shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate text-foreground tracking-tight">{i.produto.nome}</div>
              <div className="text-xs text-primary cc-price">R$ {(i.produto.preco * i.qtd).toFixed(2)}</div>
            </div>
            <div className="flex items-center bg-card border border-border rounded-full">
              <button onClick={() => removeItem(i.produto.id)} className="h-8 w-8 flex items-center justify-center text-primary">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="px-1 min-w-[20px] text-center text-sm font-bold tabular-nums">{i.qtd}</span>
              <button onClick={() => addItem(i.produto.id)} className="h-8 w-8 flex items-center justify-center text-primary">
                <Plus className="h-3.5 w-3.5" />
              </button>
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
