import type { TicketStatus } from "../types";

const LABEL: Record<TicketStatus, string> = {
  aberto: "Aberto",
  respondido: "Respondido",
  fechado: "Fechado",
};

const STYLE: Record<TicketStatus, string> = {
  aberto: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  respondido: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  fechado: "bg-white/10 text-white/60 border-white/15",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${STYLE[status]}`}>
      {LABEL[status]}
    </span>
  );
}
