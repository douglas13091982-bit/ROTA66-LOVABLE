import { useState } from "react";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useProdutoForm } from "../hooks/use-produto-form";
import type { Produto } from "../logic/types";

export function ProdutoDialog({
  lojaId,
  produto,
  onSaved,
  children,
}: {
  lojaId: string;
  produto?: Produto;
  onSaved: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { form, setForm, preview, uploading, saving, handleUpload, handleSave } = useProdutoForm(
    lojaId,
    produto,
    onSaved,
    () => setOpen(false),
  );

  const INPUT = "mt-1 w-full px-3 py-2 bg-background border border-border rounded-md text-sm";
  const LABEL = "text-xs font-bold uppercase tracking-wider text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{produto ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-3 pt-2">
          <label className="block">
            <span className={LABEL}>Nome</span>
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
              maxLength={120}
              className={INPUT}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={LABEL}>Preço (R$)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: e.target.value })}
                required
                className={INPUT}
              />
            </label>
            <label className="block">
              <span className={LABEL}>Categoria</span>
              <input
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                maxLength={50}
                className={INPUT}
              />
            </label>
          </div>
          <label className="block">
            <span className={LABEL}>Descrição</span>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              maxLength={500}
              rows={3}
              className={INPUT}
            />
          </label>
          <label className="block">
            <span className={LABEL}>Imagem</span>
            <div className="mt-1 flex items-center gap-3">
              {preview && (
                <img
                  src={preview}
                  alt=""
                  className="h-16 w-16 object-cover rounded-md border border-border"
                />
              )}
              <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-background border border-dashed border-border rounded-md text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "Enviando..." : form.imagem_url ? "Trocar" : "Enviar imagem"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                />
              </label>
            </div>
          </label>
          <label className="block">
            <span className={LABEL}>Ordem</span>
            <input
              type="number"
              value={form.ordem}
              onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
              className={INPUT}
            />
            <span className="text-[10px] text-muted-foreground">
              Menor número aparece primeiro.
            </span>
          </label>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md border border-border hover:bg-background"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 px-4 py-2 bg-gradient-red shadow-red text-primary-foreground rounded-md text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
