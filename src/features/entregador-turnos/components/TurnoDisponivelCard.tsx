import { useState } from "react";
import { CheckCircle2, Clock, Loader2, Store } from "lucide-react";
import type { TurnoDisponivel } from "../logic/types";

export function TurnoDisponivelCard({
  t,
  onAceitar,
}: {
  t: TurnoDisponivel;
  onAceitar: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const inicio = new Date(`${t.data_turno}T${t.hora_inicio}`);
  const garantido = Number(t.valor_por_hora) * Number(t.duracao_horas);

  async function clicar() {
    setBusy(true);
    await onAceitar();
    setBusy(false);
  }

  return (
    <div className="bg-card border border-primary/30 rounded-lg p-4 md:p-5 shadow-card space-y-3 hover:border-primary/60 transition-colors">
      <div className="flex justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Store className="h-3.5 w-3.5" /> {t.loja_nome ?? "Loja"}
          </div>
          <div className="font-display text-xl leading-tight">
            {inicio.toLocaleDateString("pt-BR", {
              weekday: "short",
              day: "2-digit",
              month: "2-digit",
            })}{" "}
            · {t.hora_inicio.slice(0, 5)}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {Number(t.duracao_horas)}h de turno
            </span>
            {t.vagas_total > 1 && (
              <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary font-bold text-[10px] uppercase tracking-wider">
                {t.vagas_total - t.vagas_preenchidas} de {t.vagas_total} vagas
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Garantido
          </div>
          <div className="font-display text-2xl text-emerald-400">
            R$ {garantido.toFixed(2)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            + R$ {Number(t.taxa_por_entrega).toFixed(2)} / entrega
          </div>
        </div>
      </div>

      {t.observacoes && (
        <div className="text-sm text-muted-foreground bg-background/40 border border-border/60 rounded-md p-3">
          {t.observacoes}
        </div>
      )}

      <button
        onClick={clicar}
        disabled={busy}
        className="w-full px-4 py-3 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase tracking-wider text-sm rounded-md hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Aceitar turno
      </button>
    </div>
  );
}
