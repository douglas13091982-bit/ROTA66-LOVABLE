import { CalendarClock, Clock } from "lucide-react";
import { STATUS_LABEL } from "../logic/constants";
import type { TurnoRow } from "../logic/types";
import { AceitesList } from "./AceitesList";
import { TurnoActions } from "./TurnoActions";

export function TurnoCard({ t, onChange }: { t: TurnoRow; onChange: () => void }) {
  const status = STATUS_LABEL[t.status];
  const data = new Date(`${t.data_turno}T${t.hora_inicio}`);
  const total = Number(t.valor_por_hora) * Number(t.duracao_horas);
  const vagasRestantes = t.vagas_total - t.vagas_preenchidas;

  return (
    <div className="bg-card border border-border rounded-lg p-4 md:p-5 shadow-card space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <CalendarClock className="h-5 w-5 text-primary" />
          <div>
            <div className="font-display text-lg leading-tight">
              {data.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
              {" · "}
              {t.hora_inicio.slice(0, 5)}
            </div>
            <div className="text-xs text-muted-foreground">
              Duração: {Number(t.duracao_horas)} h · {t.vagas_total} vaga
              {t.vagas_total > 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {t.vagas_total > 1 && (t.status === "publicado" || t.status === "aceito") && (
            <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-primary/15 text-primary">
              {t.vagas_preenchidas}/{t.vagas_total}
            </span>
          )}
          <span
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${status.color}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div className="bg-background/50 border border-border/60 rounded-md p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Por hora</div>
          <div className="font-display text-lg">R$ {Number(t.valor_por_hora).toFixed(2)}</div>
        </div>
        <div className="bg-background/50 border border-border/60 rounded-md p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Por entrega
          </div>
          <div className="font-display text-lg">R$ {Number(t.taxa_por_entrega).toFixed(2)}</div>
        </div>
        <div className="bg-background/50 border border-border/60 rounded-md p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Garantido</div>
          <div className="font-display text-lg text-emerald-400">R$ {total.toFixed(2)}</div>
        </div>
      </div>

      {t.observacoes && (
        <div className="text-sm text-muted-foreground bg-background/40 border border-border/60 rounded-md p-3">
          {t.observacoes}
        </div>
      )}

      <AceitesList
        aceites={t.aceites ?? []}
        vagasPreenchidas={t.vagas_preenchidas}
        vagasTotal={t.vagas_total}
      />

      {t.status === "publicado" && vagasRestantes > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 px-3 py-2 rounded-md">
          <Clock className="h-3.5 w-3.5" />
          Aguardando entregadores · {vagasRestantes} vaga{vagasRestantes > 1 ? "s" : ""} restante
          {vagasRestantes > 1 ? "s" : ""}
        </div>
      )}

      <TurnoActions t={t} onChange={onChange} />
    </div>
  );
}
