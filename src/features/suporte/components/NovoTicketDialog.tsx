import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useCriarTicket } from "../hooks/use-suporte";

export function NovoTicketDialog({
  lojaId,
  userId,
  onClose,
}: {
  lojaId: string;
  userId: string;
  onClose: () => void;
}) {
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [prioridade, setPrioridade] = useState<"normal" | "alta">("normal");
  const criar = useCriarTicket();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (assunto.trim().length < 3) {
      toast.error("Informe um assunto válido");
      return;
    }
    if (mensagem.trim().length < 5) {
      toast.error("Descreva o problema com mais detalhes");
      return;
    }
    try {
      await criar.mutateAsync({
        lojaId,
        assunto: assunto.slice(0, 120),
        mensagemInicial: mensagem.slice(0, 2000),
        prioridade,
        autorId: userId,
      });
      toast.success("Chamado aberto");
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível abrir o chamado");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="w-full max-w-lg pp-glass-strong rounded-t-2xl md:rounded-2xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-white font-semibold">Abrir novo chamado</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/60 mb-1.5 block">Assunto</label>
            <input
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              maxLength={120}
              placeholder="Ex: Problema ao receber pedidos"
              className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/60 mb-1.5 block">Prioridade</label>
            <div className="grid grid-cols-2 gap-2">
              {(["normal", "alta"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPrioridade(p)}
                  className={`px-3 py-2 rounded-lg border text-sm capitalize ${prioridade === p ? "bg-white/10 border-white/30 text-white" : "bg-white/[0.02] border-white/10 text-white/60"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/60 mb-1.5 block">Mensagem</label>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="Descreva o problema com detalhes..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/30 resize-none"
            />
            <div className="text-[10px] text-white/40 mt-1 text-right">{mensagem.length}/2000</div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-white/70 hover:bg-white/5 text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={criar.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-red shadow-red text-white text-sm font-semibold disabled:opacity-60"
            >
              {criar.isPending ? "Enviando..." : "Abrir chamado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
