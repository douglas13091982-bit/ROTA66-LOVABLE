import type { MeuTurno, MeuTurnoRow } from "./types";

export function mapMeuTurno(r: MeuTurnoRow): MeuTurno {
  return {
    id: r.id,
    loja_id: r.loja_id,
    data_turno: r.data_turno,
    hora_inicio: r.hora_inicio,
    duracao_horas: r.duracao_horas,
    valor_por_hora: r.valor_por_hora,
    taxa_por_entrega: r.taxa_por_entrega,
    observacoes: r.observacoes,
    status: r.status,
    vagas_total: r.vagas_total,
    vagas_preenchidas: r.vagas_preenchidas,
    lojas: {
      nome: r.loja_nome,
      endereco: r.loja_endereco,
      endereco_lat: r.loja_endereco_lat,
      endereco_lng: r.loja_endereco_lng,
      telefone: r.loja_telefone,
    },
  };
}

export function fmtKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function endTime(m: MeuTurno) {
  const start = new Date(`${m.data_turno}T${m.hora_inicio}`);
  const end = new Date(start.getTime() + Number(m.duracao_horas) * 3600_000);
  return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
}

export function minutesUntil(date: Date, now: Date) {
  return Math.round((date.getTime() - now.getTime()) / 60000);
}

export function formatRelative(min: number) {
  if (min < 60) return `Em ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Em ${h}h`;
  const d = Math.floor(h / 24);
  return `Em ${d}d`;
}

export function computeWeekDays(today: Date) {
  const weekStart = new Date(today);
  const day = weekStart.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diffToMonday);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

export function filtrarFuturos(meus: MeuTurno[], now: Date) {
  return meus
    .filter((m) => {
      if (m.status !== "aceito" && m.status !== "publicado") return false;
      const start = new Date(`${m.data_turno}T${m.hora_inicio}`);
      const end = new Date(start.getTime() + Number(m.duracao_horas) * 3600_000);
      return end >= now;
    })
    .sort(
      (a, b) =>
        new Date(`${a.data_turno}T${a.hora_inicio}`).getTime() -
        new Date(`${b.data_turno}T${b.hora_inicio}`).getTime(),
    );
}

export function filtrarSemana(meus: MeuTurno[], now: Date, weekEnd: Date) {
  return meus
    .filter((m) => {
      if (m.status !== "aceito" && m.status !== "publicado") return false;
      const start = new Date(`${m.data_turno}T${m.hora_inicio}`);
      const end = new Date(start.getTime() + Number(m.duracao_horas) * 3600_000);
      return end >= now && start <= weekEnd;
    })
    .sort(
      (a, b) =>
        new Date(`${a.data_turno}T${a.hora_inicio}`).getTime() -
        new Date(`${b.data_turno}T${b.hora_inicio}`).getTime(),
    );
}

export function turnosByDate(meus: MeuTurno[]) {
  const map = new Map<string, MeuTurno[]>();
  for (const m of meus) {
    const arr = map.get(m.data_turno) ?? [];
    arr.push(m);
    map.set(m.data_turno, arr);
  }
  return map;
}
