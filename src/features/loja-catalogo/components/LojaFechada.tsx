import { Link } from "@tanstack/react-router";
import { DIAS_SEMANA, type HorarioFuncionamento } from "@/lib/horario-funcionamento";

function proximaAbertura(horario: HorarioFuncionamento | null | undefined, now = new Date()) {
  if (!horario) return null;
  const hoje = DIAS_SEMANA[now.getDay()];
  const cfgHoje = horario[hoje.key];
  const minutosAgora = now.getHours() * 60 + now.getMinutes();

  if (cfgHoje?.aberto) {
    const [h, m] = cfgHoje.inicio.split(":").map(Number);
    if (h * 60 + m > minutosAgora) {
      return { dia: "hoje", inicio: cfgHoje.inicio, fim: cfgHoje.fim };
    }
  }
  for (let i = 1; i <= 7; i++) {
    const d = DIAS_SEMANA[(now.getDay() + i) % 7];
    const cfg = horario[d.key];
    if (cfg?.aberto) {
      return { dia: i === 1 ? "amanhã" : d.label, inicio: cfg.inicio, fim: cfg.fim };
    }
  }
  return null;
}

export function LojaFechada({
  nome,
  horario,
}: {
  nome?: string | null;
  horario?: HorarioFuncionamento | null;
}) {
  const hoje = DIAS_SEMANA[new Date().getDay()];
  const cfgHoje = horario?.[hoje.key];
  const proxima = proximaAbertura(horario);

  return (
    <div className="catalogo-clean min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold uppercase tracking-[0.18em] mb-4">
          Fechado agora
        </div>
        <h1 className="font-display text-3xl mb-2 cc-ink-text">
          {nome ?? "Loja"} está fechada
        </h1>
        <p className="text-muted-foreground mb-6">
          No momento não estamos aceitando pedidos. Volte em breve!
        </p>

        {horario && (
          <div className="bg-muted/40 rounded-xl p-4 mb-6 text-left">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
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
                    <span>
                      {cfg?.aberto ? `${cfg.inicio} - ${cfg.fim}` : "Fechado"}
                    </span>
                  </div>
                );
              })}
            </div>
            {proxima && (
              <p className="mt-3 pt-3 border-t text-sm cc-ink-text">
                Abrimos {proxima.dia === "hoje" || proxima.dia === "amanhã" ? proxima.dia : `na ${proxima.dia}`} às{" "}
                <strong>{proxima.inicio}</strong>
              </p>
            )}
            {!proxima && cfgHoje?.aberto === false && (
              <p className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                Sem horários cadastrados para os próximos dias.
              </p>
            )}
          </div>
        )}

        <Link
          to="/"
          className="text-primary font-semibold uppercase tracking-[0.18em] text-xs hover:underline"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
