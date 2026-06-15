import { FilePlus2, ScrollText } from "lucide-react";
import type { ContratoRow } from "../logic/types";

type Props = {
  contratos: ContratoRow[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNovaVersao: () => void;
};

export function VersoesList({
  contratos,
  isLoading,
  selectedId,
  onSelect,
  onNovaVersao,
}: Props) {
  return (
    <div className="pp-card rounded-2xl p-3 h-fit">
      <div className="flex items-center justify-between px-2 pb-3">
        <div className="flex items-center gap-2 text-white">
          <ScrollText className="h-4 w-4 text-yellow-300" />
          <div className="text-[13px] font-bold">Versões</div>
        </div>
        <button
          type="button"
          onClick={onNovaVersao}
          className="h-7 px-2 rounded-md bg-white/5 hover:bg-white/10 text-white/80 text-[11px] font-semibold flex items-center gap-1"
          title="Criar nova versão a partir desta"
        >
          <FilePlus2 className="h-3.5 w-3.5" />
          Nova
        </button>
      </div>
      {isLoading && <div className="text-[12px] text-white/50 px-2">Carregando...</div>}
      <div className="space-y-1">
        {contratos.map((c) => {
          const active = selectedId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className={`w-full text-left px-3 py-2 rounded-lg transition border ${
                active
                  ? "bg-white/[0.06] border-white/15"
                  : "bg-transparent border-transparent hover:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-[13px] font-semibold text-white">v{c.versao}</div>
                {c.ativo && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-400/10 border border-emerald-400/30 px-1.5 py-0.5 rounded">
                    Ativa
                  </span>
                )}
              </div>
              <div className="text-[11px] text-white/50 truncate">{c.titulo}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
