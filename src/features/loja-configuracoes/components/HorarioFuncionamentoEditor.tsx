import {
  DIAS_SEMANA,
  lojaAbertaAgora,
  type DiaKey,
  type HorarioFuncionamento,
} from "@/lib/horario-funcionamento";

export function HorarioFuncionamentoEditor({
  horario,
  setHorario,
}: {
  horario: HorarioFuncionamento;
  setHorario: (h: HorarioFuncionamento) => void;
}) {
  return (
    <div className="p-4 bg-background rounded-md border border-border space-y-3">
      <div>
        <div className="font-bold uppercase tracking-wider text-sm">Horário de funcionamento</div>
        <div className="text-xs text-muted-foreground">
          A loja abre e fecha automaticamente nos horários abaixo (horário de Brasília)
        </div>
      </div>

      <div className="space-y-2">
        {DIAS_SEMANA.map((d) => {
          const cfg = horario[d.key as DiaKey] ?? { aberto: false, inicio: "08:00", fim: "18:00" };
          const setCfg = (patch: Partial<typeof cfg>) =>
            setHorario({ ...horario, [d.key]: { ...cfg, ...patch } });
          return (
            <div key={d.key} className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-2 w-28 shrink-0 text-sm">
                <input
                  type="checkbox"
                  checked={cfg.aberto}
                  onChange={(e) => setCfg({ aberto: e.target.checked })}
                  className="accent-primary"
                />
                <span className="font-bold uppercase tracking-wider text-xs">{d.label}</span>
              </label>
              <input
                type="time"
                disabled={!cfg.aberto}
                value={cfg.inicio}
                onChange={(e) => setCfg({ inicio: e.target.value })}
                className="bg-card border border-border rounded-md px-2 py-1.5 text-sm disabled:opacity-40"
              />
              <span className="text-xs text-muted-foreground">às</span>
              <input
                type="time"
                disabled={!cfg.aberto}
                value={cfg.fim}
                onChange={(e) => setCfg({ fim: e.target.value })}
                className="bg-card border border-border rounded-md px-2 py-1.5 text-sm disabled:opacity-40"
              />
            </div>
          );
        })}
        <p className="text-[11px] text-muted-foreground">
          {lojaAbertaAgora(horario)
            ? "✓ Neste momento a loja está aberta."
            : "✗ Neste momento a loja está fechada."}
        </p>
      </div>
    </div>
  );
}
