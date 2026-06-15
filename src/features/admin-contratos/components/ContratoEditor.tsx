import { CheckCircle2, Eye, EyeOff, Save } from "lucide-react";
import { ContratoBody } from "@/components/ContratoView";
import type { ContratoRow } from "../logic/types";

type Props = {
  selected: ContratoRow;
  titulo: string;
  conteudo: string;
  preview: boolean;
  saving: boolean;
  onTituloChange: (v: string) => void;
  onConteudoChange: (v: string) => void;
  onTogglePreview: () => void;
  onSalvar: () => void;
  onAtivar: () => void;
};

export function ContratoEditor({
  selected,
  titulo,
  conteudo,
  preview,
  saving,
  onTituloChange,
  onConteudoChange,
  onTogglePreview,
  onSalvar,
  onAtivar,
}: Props) {
  return (
    <div className="pp-card rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-white/40">
            Editando versão
          </div>
          <div className="text-white text-lg font-bold">v{selected.versao}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePreview}
            className="h-9 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-[12px] font-semibold flex items-center gap-2"
          >
            {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {preview ? "Editar" : "Pré-visualizar"}
          </button>
          {!selected.ativo && (
            <button
              type="button"
              onClick={onAtivar}
              className="h-9 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[12px] font-bold flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Ativar
            </button>
          )}
          <button
            type="button"
            onClick={onSalvar}
            disabled={saving}
            className="h-9 px-3 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black text-[12px] font-bold flex items-center gap-2 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      <label className="block">
        <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-white/50 mb-1.5">
          Título
        </span>
        <input
          value={titulo}
          onChange={(e) => onTituloChange(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-400/60"
        />
      </label>

      {preview ? (
        <div className="bg-black/40 border border-white/10 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
          <ContratoBody conteudo={conteudo} />
        </div>
      ) : (
        <label className="block">
          <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-white/50 mb-1.5">
            Conteúdo (markdown simples: # ## ###, listas com "-", **negrito**)
          </span>
          <textarea
            value={conteudo}
            onChange={(e) => onConteudoChange(e.target.value)}
            rows={22}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white/90 font-mono text-[12.5px] leading-relaxed focus:outline-none focus:border-yellow-400/60"
          />
        </label>
      )}

      <div className="text-[11px] text-white/50">
        Dica: ao ativar uma nova versão, todas as lojas existentes verão um modal
        no próximo acesso pedindo aceite da versão atual.
      </div>
    </div>
  );
}
