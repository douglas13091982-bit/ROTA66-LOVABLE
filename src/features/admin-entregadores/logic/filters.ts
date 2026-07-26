import type { EntregadorRow, StatusFilter, VeiculoFilter } from "./types";

const VEICULOS_VALIDOS = ["moto", "bike_eletrica", "carro", "caminhonete"] as const;

export function veiculoKey(tipo: any): Exclude<VeiculoFilter, "todos"> {
  const t = String(tipo ?? "").toLowerCase();
  return (VEICULOS_VALIDOS as readonly string[]).includes(t)
    ? (t as Exclude<VeiculoFilter, "todos">)
    : "moto";
}

export function contarPorVeiculo(list: EntregadorRow[]): Record<VeiculoFilter, number> {
  const counts: Record<VeiculoFilter, number> = {
    todos: list.length,
    moto: 0,
    bike_eletrica: 0,
    carro: 0,
    caminhonete: 0,
  };
  list.forEach((p) => {
    counts[veiculoKey(p.tipo_veiculo)] += 1;
  });
  return counts;
}

export function onlyDigits(s: string) {
  return (s ?? "").replace(/\D/g, "");
}

export function waLink(phone: string, message?: string) {
  const d = onlyDigits(phone);
  if (!d) return null;
  const withCountry = d.startsWith("55") ? d : `55${d}`;
  const base = `https://wa.me/${withCountry}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function mensagemAprovacao(nome: string | null) {
  const primeiro = (nome ?? "").trim().split(/\s+/)[0] || "Entregador";
  return (
    `🎉 Parabéns, ${primeiro}! ` +
    `Seu cadastro na Rota 66 foi *APROVADO*! ✅\n\n` +
    `Já pode abrir o app e começar a receber pedidos. ` +
    `Qualquer dúvida é só chamar por aqui. Boas entregas! 🛵💨`
  );
}

export function filtrarEntregadores(
  list: EntregadorRow[],
  filter: StatusFilter,
  search: string,
  veiculo: VeiculoFilter = "todos"
): EntregadorRow[] {
  const normalize = (s: any) => String(s ?? "").toLowerCase();
  const normalizeDigits = (s: any) => String(s ?? "").replace(/\D/g, "");
  const q = search.trim().toLowerCase();
  const qDigits = normalizeDigits(search);

  return list.filter((p) => {
    if (filter !== "todas" && p.status !== filter) return false;
    if (veiculo !== "todos" && veiculoKey(p.tipo_veiculo) !== veiculo) return false;
    if (!q) return true;
    const textMatch =
      normalize(p.full_name).includes(q) ||
      normalize(p.email).includes(q) ||
      normalize(p.phone).includes(q);
    const digitMatch = qDigits.length > 0 && normalizeDigits(p.phone).includes(qDigits);
    return textMatch || digitMatch;
  });
}
