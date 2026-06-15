export const DIAS_SEMANA = [
  { key: "dom", label: "Domingo", idx: 0 },
  { key: "seg", label: "Segunda", idx: 1 },
  { key: "ter", label: "Terça", idx: 2 },
  { key: "qua", label: "Quarta", idx: 3 },
  { key: "qui", label: "Quinta", idx: 4 },
  { key: "sex", label: "Sexta", idx: 5 },
  { key: "sab", label: "Sábado", idx: 6 },
] as const;

export type DiaKey = (typeof DIAS_SEMANA)[number]["key"];

export type HorarioDia = {
  aberto: boolean;
  inicio: string; // "HH:MM"
  fim: string;    // "HH:MM"
};

export type HorarioFuncionamento = Partial<Record<DiaKey, HorarioDia>>;

export const HORARIO_PADRAO: HorarioFuncionamento = DIAS_SEMANA.reduce((acc, d) => {
  acc[d.key] = { aberto: d.idx >= 1 && d.idx <= 6, inicio: "08:00", fim: "18:00" };
  return acc;
}, {} as HorarioFuncionamento);

function parseHM(s: string): number {
  const [h, m] = s.split(":").map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

export function lojaAbertaAgora(horario: HorarioFuncionamento | null | undefined, date = new Date()): boolean {
  if (!horario) return false;
  const dia = DIAS_SEMANA[date.getDay()];
  const cfg = horario[dia.key];
  if (!cfg || !cfg.aberto) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  const ini = parseHM(cfg.inicio);
  const fim = parseHM(cfg.fim);
  if (fim <= ini) {
    // Atravessa meia-noite
    return now >= ini || now < fim;
  }
  return now >= ini && now < fim;
}
