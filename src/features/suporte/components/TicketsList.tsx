import { useState } from "react";
import { Search } from "lucide-react";
import type { Modo, Ticket, TicketStatus } from "../types";
import { StatusBadge } from "./StatusBadge";

function formatDate(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const sameDay = d.toDateString() === hoje.toDateString();
  return sameDay
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function TicketsList({
  tickets,
  modo,
  selectedId,
  onSelect,
}: {
  tickets: Ticket[];
  modo: Modo;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [filtro, setFiltro] = useState<TicketStatus | "todos">("todos");
  const [busca, setBusca] = useState("");

  const filtered = tickets.filter((t) => {
    if (filtro !== "todos" && t.status !== filtro) return false;
    if (busca) {
      const q = busca.toLowerCase();
      if (!t.assunto.toLowerCase().includes(q) && !(t.loja_nome ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const naoLidasCampo = modo === "loja" ? "nao_lidas_loja" : "nao_lidas_admin";

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-2 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={modo === "admin" ? "Buscar loja ou assunto..." : "Buscar assunto..."}
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {(["todos", "aberto", "respondido", "fechado"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFiltro(s)}
              className={`px-2.5 py-1 rounded-md text-[11px] capitalize whitespace-nowrap ${filtro === s ? "bg-white/15 text-white" : "bg-white/[0.02] text-white/50 hover:text-white/80"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-white/40 text-sm">Nenhum chamado.</div>
        )}
        {filtered.map((t) => {
          const naoLidas = (t as any)[naoLidasCampo] ?? 0;
          const active = t.id === selectedId;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={`w-full text-left px-4 py-3 border-b border-white/5 transition ${active ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="text-sm font-semibold text-white truncate flex-1">{t.assunto}</div>
                {naoLidas > 0 && (
                  <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-red text-white text-[10px] font-bold flex items-center justify-center">
                    {naoLidas}
                  </span>
                )}
              </div>
              {modo === "admin" && t.loja_nome && (
                <div className="text-[11px] text-white/50 truncate mb-1">{t.loja_nome}</div>
              )}
              <div className="flex items-center justify-between gap-2">
                <StatusBadge status={t.status} />
                <span className="text-[10px] text-white/40">{formatDate(t.ultima_mensagem_em)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
