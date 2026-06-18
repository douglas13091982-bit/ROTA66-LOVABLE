import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Send } from "lucide-react";
import type { Modo, Ticket } from "../types";
import {
  useEnviarMensagem,
  useFecharTicket,
  useMarcarLido,
  useMensagens,
  useMensagensRealtime,
} from "../hooks/use-suporte";
import { StatusBadge } from "./StatusBadge";

export function TicketChat({
  ticket,
  modo,
  userId,
}: {
  ticket: Ticket;
  modo: Modo;
  userId: string;
}) {
  const { data: mensagens } = useMensagens(ticket.id);
  useMensagensRealtime(ticket.id);
  const enviar = useEnviarMensagem(modo);
  const fechar = useFecharTicket();
  const marcarLido = useMarcarLido();
  const [texto, setTexto] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Marca como lido ao abrir/atualizar ticket
  useEffect(() => {
    const campo = modo === "loja" ? "nao_lidas_loja" : "nao_lidas_admin";
    if ((ticket as any)[campo] > 0) {
      marcarLido.mutate(ticket.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id, ticket.ultima_mensagem_em]);

  // Auto-scroll para fim
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [mensagens]);

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = texto.trim();
    if (t.length === 0) return;
    if (t.length > 2000) {
      toast.error("Mensagem muito longa");
      return;
    }
    try {
      await enviar.mutateAsync({ ticketId: ticket.id, mensagem: t, autorId: userId });
      setTexto("");
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível enviar");
    }
  };

  const handleFechar = async () => {
    if (!confirm("Deseja realmente fechar este chamado?")) return;
    try {
      await fechar.mutateAsync(ticket.id);
      toast.success("Chamado fechado");
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao fechar");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-white font-semibold truncate">{ticket.assunto}</div>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={ticket.status} />
            {ticket.prioridade === "alta" && (
              <span className="text-[10px] uppercase tracking-wider text-amber-300 font-semibold">Alta prioridade</span>
            )}
            {modo === "admin" && ticket.loja_nome && (
              <span className="text-[11px] text-white/50 truncate">· {ticket.loja_nome}</span>
            )}
          </div>
        </div>
        {ticket.status !== "fechado" && (
          <button
            onClick={handleFechar}
            disabled={fechar.isPending}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-white/70 hover:bg-white/5 text-xs disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Fechar
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {(mensagens ?? []).map((m) => {
          const meuLado = m.autor_tipo === modo;
          return (
            <div key={m.id} className={`flex ${meuLado ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${meuLado ? "bg-gradient-red text-white" : "bg-white/[0.06] text-white border border-white/10"}`}
              >
                <div className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">
                  {m.autor_tipo === "admin" ? "Suporte" : "Loja"}
                </div>
                <div className="whitespace-pre-wrap break-words">{m.mensagem}</div>
                <div className="text-[10px] opacity-60 mt-1 text-right">
                  {new Date(m.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
        {(mensagens ?? []).length === 0 && (
          <div className="text-center text-white/40 text-sm py-10">Sem mensagens ainda.</div>
        )}
      </div>

      <form onSubmit={handleEnviar} className="border-t border-white/5 p-3 flex gap-2">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={ticket.status === "fechado"}
          placeholder={ticket.status === "fechado" ? "Chamado fechado" : "Digite sua mensagem..."}
          maxLength={2000}
          className="flex-1 bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/30 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={enviar.isPending || ticket.status === "fechado" || texto.trim().length === 0}
          className="px-4 rounded-lg bg-gradient-red shadow-red text-white disabled:opacity-50"
          aria-label="Enviar"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
