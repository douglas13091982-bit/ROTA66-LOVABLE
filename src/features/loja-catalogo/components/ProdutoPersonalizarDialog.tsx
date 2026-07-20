import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { precoEfetivo, type Produto } from "@/routes/-catalogo-types";
import type { AdicionalEscolhido } from "../logic/cart-line";

type Props = {
  produto: Produto;
  onClose: () => void;
  onConfirm: (adicionais: AdicionalEscolhido[], qtd: number) => void;
};

export function ProdutoPersonalizarDialog({ produto, onClose, onConfirm }: Props) {
  const grupos = produto.adicionais_grupos ?? [];
  const [sel, setSel] = useState<Record<string, Set<string>>>(() => {
    const init: Record<string, Set<string>> = {};
    for (const g of grupos) init[g.id] = new Set();
    return init;
  });
  const [qtd, setQtd] = useState(1);

  function toggle(grupoId: string, opcaoId: string, max: number) {
    setSel((prev) => {
      const cur = new Set(prev[grupoId]);
      if (cur.has(opcaoId)) {
        cur.delete(opcaoId);
      } else {
        if (max === 1) {
          cur.clear();
          cur.add(opcaoId);
        } else if (cur.size < max) {
          cur.add(opcaoId);
        }
      }
      return { ...prev, [grupoId]: cur };
    });
  }

  const escolhidas: AdicionalEscolhido[] = useMemo(() => {
    const out: AdicionalEscolhido[] = [];
    for (const g of grupos) {
      const ids = sel[g.id] ?? new Set();
      for (const o of g.opcoes) {
        if (ids.has(o.id)) {
          out.push({
            grupo_id: g.id,
            grupo_nome: g.nome,
            opcao_id: o.id,
            nome: o.nome,
            preco: Number(o.preco),
          });
        }
      }
    }
    return out;
  }, [sel, grupos]);

  const precoUnit = precoEfetivo(produto) + escolhidas.reduce((s, a) => s + a.preco, 0);
  const total = precoUnit * qtd;

  const invalido = grupos.some((g) => {
    const n = sel[g.id]?.size ?? 0;
    if (g.obrigatorio && n < Math.max(1, g.min_escolhas || 0)) return true;
    if (n < (g.min_escolhas || 0)) return true;
    return false;
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-t-3xl md:rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-300"
      >
        <div className="md:hidden flex justify-center pt-2 pb-1 shrink-0">
          <div className="h-1.5 w-12 rounded-full bg-border" />
        </div>
        <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
          <h2 className="font-display text-lg truncate tracking-tight">{produto.nome}</h2>
          <button onClick={onClose} aria-label="Fechar" className="p-2 -mr-2 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
          {produto.imagem_url && (
            <img src={produto.imagem_url} alt={produto.nome} className="w-full h-40 object-cover rounded-xl" />
          )}
          {produto.descricao && <p className="text-sm text-muted-foreground">{produto.descricao}</p>}

          {grupos.map((g) => {
            const single = g.max_escolhas <= 1;
            return (
              <div key={g.id} className="bg-background rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-bold">{g.nome}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {g.obrigatorio ? "Obrigatório" : "Opcional"} ·{" "}
                      {single ? "escolha 1" : `até ${g.max_escolhas}`}
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {g.opcoes.map((o) => {
                    const checked = sel[g.id]?.has(o.id) ?? false;
                    return (
                      <label
                        key={o.id}
                        className={`flex items-center justify-between gap-2 p-2 rounded-lg border cursor-pointer ${
                          checked ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type={single ? "radio" : "checkbox"}
                            name={g.id}
                            checked={checked}
                            onChange={() => toggle(g.id, o.id, g.max_escolhas || 1)}
                          />
                          <span className="text-sm">{o.nome}</span>
                        </div>
                        {Number(o.preco) > 0 && (
                          <span className="text-sm text-primary font-semibold">
                            + R$ {Number(o.preco).toFixed(2)}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] bg-card shrink-0 flex items-center gap-3">
          <div className="flex items-center bg-background border border-border rounded-full">
            <button
              onClick={() => setQtd((q) => Math.max(1, q - 1))}
              className="h-9 w-9 flex items-center justify-center text-primary"
            >
              −
            </button>
            <span className="px-2 min-w-[22px] text-center font-bold tabular-nums">{qtd}</span>
            <button
              onClick={() => setQtd((q) => q + 1)}
              className="h-9 w-9 flex items-center justify-center text-primary"
            >
              +
            </button>
          </div>
          <button
            disabled={invalido}
            onClick={() => onConfirm(escolhidas, qtd)}
            className="cc-cta flex-1 px-4 py-3 rounded-2xl font-semibold uppercase text-[12px] tracking-[0.18em] disabled:opacity-40 flex items-center justify-between"
          >
            <span>Adicionar</span>
            <span className="cc-price normal-case tracking-tight text-base">R$ {total.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
