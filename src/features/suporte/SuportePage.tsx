import { useMemo, useState } from "react";
import { LifeBuoy, Plus } from "lucide-react";
import type { Modo } from "./types";
import { useTickets, useTicketsRealtime } from "./hooks/use-suporte";
import { TicketsList } from "./components/TicketsList";
import { TicketChat } from "./components/TicketChat";
import { NovoTicketDialog } from "./components/NovoTicketDialog";

export function SuportePage({
  modo,
  userId,
  lojaId,
}: {
  modo: Modo;
  userId: string;
  lojaId?: string;
}) {
  const { data: tickets, isLoading } = useTickets(modo, lojaId);
  useTicketsRealtime(modo, lojaId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);

  const selected = useMemo(
    () => (tickets ?? []).find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-red shadow-red grid place-items-center text-white">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Suporte</h1>
            <p className="text-white/50 text-sm">
              {modo === "loja"
                ? "Fale direto com o administrador da plataforma"
                : "Chamados abertos pelas lojas"}
            </p>
          </div>
        </div>
        {modo === "loja" && lojaId && (
          <button
            onClick={() => setNovoOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-red shadow-red text-white font-semibold text-sm"
          >
            <Plus className="h-4 w-4" />
            Novo chamado
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-[320px_1fr] gap-3 h-[calc(100vh-220px)] min-h-[500px] rounded-2xl pp-glass-strong border border-white/10 overflow-hidden">
        <div className="border-r border-white/5 min-h-0">
          {isLoading ? (
            <div className="p-6 text-white/40 text-sm">Carregando...</div>
          ) : (
            <TicketsList tickets={tickets ?? []} modo={modo} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </div>
        <div className="min-h-0">
          {selected ? (
            <TicketChat ticket={selected} modo={modo} userId={userId} />
          ) : (
            <div className="h-full flex items-center justify-center text-white/40 text-sm p-8 text-center">
              {modo === "loja"
                ? "Selecione um chamado ou abra um novo para conversar com o suporte."
                : "Selecione um chamado para visualizar a conversa."}
            </div>
          )}
        </div>
      </div>

      {novoOpen && lojaId && (
        <NovoTicketDialog lojaId={lojaId} userId={userId} onClose={() => setNovoOpen(false)} />
      )}
    </div>
  );
}
