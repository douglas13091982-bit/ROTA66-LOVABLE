import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useProdutoAdicionais } from "../hooks/use-produto-adicionais";
import type { Produto } from "../logic/types";

export function AdicionaisDialog({
  produto,
  children,
}: {
  produto: Produto;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const {
    grupos,
    loading,
    addGrupo,
    updateGrupo,
    removeGrupo,
    addOpcao,
    updateOpcao,
    removeOpcao,
  } = useProdutoAdicionais(produto.id, open);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionais — {produto.nome}</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Cadastre grupos de adicionais (ex.: "Escolha a borda") e opções (ex.: "Catupiry" + R$ 5,00).
          O cliente escolhe conforme as regras de cada grupo.
        </p>

        <div className="space-y-4 pt-2">
          {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}

          {grupos.map((g) => (
            <div key={g.id} className="border border-border rounded-lg p-3 space-y-3 bg-background">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <label className="md:col-span-2 block">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Nome do grupo</span>
                  <input
                    defaultValue={g.nome}
                    onBlur={(e) => e.target.value !== g.nome && updateGrupo(g.id, { nome: e.target.value })}
                    className="mt-1 w-full px-2 py-1.5 bg-card border border-border rounded text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Mín.</span>
                  <input
                    type="number"
                    min={0}
                    defaultValue={g.min_escolhas}
                    onBlur={(e) => updateGrupo(g.id, { min_escolhas: Number(e.target.value) })}
                    className="mt-1 w-full px-2 py-1.5 bg-card border border-border rounded text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Máx.</span>
                  <input
                    type="number"
                    min={1}
                    defaultValue={g.max_escolhas}
                    onBlur={(e) => updateGrupo(g.id, { max_escolhas: Number(e.target.value) })}
                    className="mt-1 w-full px-2 py-1.5 bg-card border border-border rounded text-sm"
                  />
                </label>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={g.obrigatorio}
                    onChange={(e) => updateGrupo(g.id, { obrigatorio: e.target.checked })}
                  />
                  Obrigatório
                </label>
                <button
                  onClick={() => removeGrupo(g.id)}
                  className="text-xs text-red-500 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Remover grupo
                </button>
              </div>

              <div className="space-y-1.5">
                {g.opcoes.map((o) => (
                  <div key={o.id} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      defaultValue={o.nome}
                      onBlur={(e) => e.target.value !== o.nome && updateOpcao(o.id, { nome: e.target.value })}
                      placeholder="Nome"
                      className="col-span-6 px-2 py-1.5 bg-card border border-border rounded text-sm"
                    />
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={o.preco}
                      onBlur={(e) => updateOpcao(o.id, { preco: Number(e.target.value) })}
                      placeholder="Preço"
                      className="col-span-3 px-2 py-1.5 bg-card border border-border rounded text-sm"
                    />
                    <label className="col-span-2 flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={o.ativo}
                        onChange={(e) => updateOpcao(o.id, { ativo: e.target.checked })}
                      />
                      Ativo
                    </label>
                    <button
                      onClick={() => removeOpcao(o.id)}
                      className="col-span-1 flex items-center justify-center h-8 w-8 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30"
                      title="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addOpcao(g.id, g.opcoes.length)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Plus className="h-3 w-3" /> Adicionar opção
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addGrupo}
            className="w-full flex items-center justify-center gap-1 px-3 py-2 rounded-md border border-dashed border-border text-xs font-bold uppercase text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Novo grupo de adicionais
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
