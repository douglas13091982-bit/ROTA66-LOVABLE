import type { Produto } from "@/routes/-catalogo-types";
import { AddButton, QtyStepper } from "./QtyStepper";

type Props = {
  items: Produto[];
  cart: Record<string, number>;
  addItem: (id: string) => void;
  removeItem: (id: string) => void;
};

export function CategoriaCarrossel({ items, cart, addItem, removeItem }: Props) {
  return (
    <div className="flex gap-3 overflow-x-auto cc-scroll-x snap-x snap-mandatory scroll-smooth pb-2 -mx-4 px-4">
      {items.map((p) => (
        <div
          key={p.id}
          className="cc-card snap-start shrink-0 w-[160px] sm:w-[180px] rounded-2xl p-2.5 flex flex-col gap-2 group"
        >
          <div className="cc-img-wrap h-[140px] w-full rounded-xl shrink-0 overflow-hidden">
            {p.imagem_url ? (
              <img src={p.imagem_url} alt={p.nome} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">sem foto</div>
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col">
            <h3 className="font-display text-[13px] leading-tight tracking-tight text-foreground line-clamp-2">{p.nome}</h3>
            {p.descricao && <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 leading-snug">{p.descricao}</p>}
            <div className="mt-auto pt-2 flex items-center justify-between gap-2">
              <span className="cc-price text-[15px] text-primary leading-none">R$ {Number(p.preco).toFixed(2)}</span>
              {cart[p.id] ? (
                <QtyStepper qtd={cart[p.id]} onAdd={() => addItem(p.id)} onRemove={() => removeItem(p.id)} size="sm" />
              ) : (
                <AddButton onAdd={() => addItem(p.id)} size="sm" />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
