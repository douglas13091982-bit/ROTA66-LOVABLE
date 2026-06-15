import { liquidoEntregador } from "@/hooks/use-taxa-sistema";
import type { Bucket, PedidoHistorico, Periodo } from "./types";

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function calcularInicioJanela() {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function agregar(
  pedidos: PedidoHistorico[],
  periodo: Periodo,
  taxaSistema: number
): {
  chartData: Bucket[];
  totalPeriodo: number;
  totalEntregas: number;
  listagem: PedidoHistorico[];
} {
  if (periodo === "semanal") {
    const hoje = startOfDay(new Date());
    const inicio = new Date(hoje);
    inicio.setDate(inicio.getDate() - 6);

    const buckets: Bucket[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      buckets.push({
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }),
        valor: 0,
        ts: d.getTime(),
      });
    }

    const dentro = pedidos.filter(
      (p) => new Date(p.updated_at).getTime() >= inicio.getTime()
    );
    for (const p of dentro) {
      const k = new Date(p.updated_at).toISOString().slice(0, 10);
      const b = buckets.find((x) => x.key === k);
      if (b) b.valor += liquidoEntregador(p.taxa_entrega, taxaSistema);
    }

    const total = dentro.reduce(
      (s, p) => s + liquidoEntregador(p.taxa_entrega, taxaSistema),
      0
    );
    return { chartData: buckets, totalPeriodo: total, totalEntregas: dentro.length, listagem: dentro };
  }

  const hojeM = new Date();
  const inicioMes = new Date(hojeM.getFullYear(), hojeM.getMonth() - 5, 1);

  const buckets: Bucket[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(inicioMes.getFullYear(), inicioMes.getMonth() + i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      valor: 0,
      ts: d.getTime(),
    });
  }

  const dentro = pedidos.filter(
    (p) => new Date(p.updated_at).getTime() >= inicioMes.getTime()
  );
  for (const p of dentro) {
    const d = new Date(p.updated_at);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = buckets.find((x) => x.key === k);
    if (b) b.valor += liquidoEntregador(p.taxa_entrega, taxaSistema);
  }

  const total = dentro.reduce(
    (s, p) => s + liquidoEntregador(p.taxa_entrega, taxaSistema),
    0
  );
  return { chartData: buckets, totalPeriodo: total, totalEntregas: dentro.length, listagem: dentro };
}

export function agruparPorDia(listagem: PedidoHistorico[]) {
  const hoje = startOfDay(new Date());
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);
  const groupLabel = (d: Date) => {
    const dd = startOfDay(d).getTime();
    if (dd === hoje.getTime()) return "HOJE";
    if (dd === ontem.getTime()) return "ONTEM";
    return d
      .toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "short" })
      .toUpperCase();
  };
  const groups: { label: string; items: PedidoHistorico[] }[] = [];
  for (const p of listagem) {
    const lab = groupLabel(new Date(p.updated_at));
    const last = groups[groups.length - 1];
    if (last && last.label === lab) last.items.push(p);
    else groups.push({ label: lab, items: [p] });
  }
  return groups;
}
