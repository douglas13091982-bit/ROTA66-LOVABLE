import { ContratoBody, type Contrato } from "@/components/ContratoView";
import { X } from "lucide-react";

export function ContratoDialog({
  contrato,
  onClose,
}: {
  contrato: Contrato;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0d0d0f] border border-white/10 rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 md:px-6 pt-5 pb-3 border-b border-white/10 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold text-white truncate">{contrato.titulo}</div>
            <div className="text-[11px] text-white/50">Versão {contrato.versao}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 grid place-items-center rounded-lg text-white/60 hover:text-white hover:bg-white/5"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 md:px-6 py-4">
          <ContratoBody conteudo={contrato.conteudo} />
        </div>
      </div>
    </div>
  );
}
