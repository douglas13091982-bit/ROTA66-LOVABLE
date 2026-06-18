import { useState } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { DIAS_SEMANA, type HorarioFuncionamento } from "@/lib/horario-funcionamento";

function proximaAbertura(horario: HorarioFuncionamento | null | undefined, now = new Date()) {
  if (!horario) return null;
  const hoje = DIAS_SEMANA[now.getDay()];
  const cfgHoje = horario[hoje.key];
  const minutosAgora = now.getHours() * 60 + now.getMinutes();

  if (cfgHoje?.aberto) {
    const [h, m] = cfgHoje.inicio.split(":").map(Number);
    if (h * 60 + m > minutosAgora) {
      return { dia: "hoje", inicio: cfgHoje.inicio };
    }
  }
  for (let i = 1; i <= 7; i++) {
    const d = DIAS_SEMANA[(now.getDay() + i) % 7];
    const cfg = horario[d.key];
    if (cfg?.aberto) {
      return { dia: i === 1 ? "amanhã" : d.label, inicio: cfg.inicio };
    }
  }
  return null;
}

export function LojaFechadaBanner({ horario }: { horario?: HorarioFuncionamento | null }) {
  const [aberto, setAberto] = useState(false);
  const hoje = DIAS_SEMANA[new Date().getDay()];
  const proxima = proximaAbertura(horario);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4">
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 overflow-hidden">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className="w-full flex items-center gap-3 p-4 text-left"
        >
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-destructive/15 text-destructive shrink-0">
            <Clock className="h-4 w-4" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold cc-ink-text">Loja fechada no momento</span>
            <span className="block text-xs text-muted-foreground truncate">
              {proxima
                ? `Abrimos ${proxima.dia === "hoje" || proxima.dia === "amanhã" ? proxima.dia : `na ${proxima.dia}`} às ${proxima.inicio}`
                : "Não estamos aceitando pedidos agora"}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${aberto ? "rotate-180" : ""}`}
          />
        </button>

        {aberto && horario && (
          <div className="px-4 pb-4 pt-1 border-t border-destructive/20">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-3">
              Horário de funcionamento
            </div>
            <div className="space-y-1 text-sm">
              {DIAS_SEMANA.map((d) => {
                const cfg = horario[d.key];
                const isHoje = d.key === hoje.key;
                return (
                  <div
                    key={d.key}
                    className={`flex justify-between ${isHoje ? "font-semibold cc-ink-text" : "text-muted-foreground"}`}
                  >
                    <span>{d.label}</span>
                    <span>{cfg?.aberto ? `${cfg.inicio} - ${cfg.fim}` : "Fechado"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
