import type { StatusFilter } from "./constants";

const normalize = (s: unknown) => String(s ?? "").toLowerCase();
const normalizeDigits = (s: unknown) => String(s ?? "").replace(/\D/g, "");

/** Filtra lojas por status e por termo livre (texto ou dígitos). */
export function filterLojas(
  lojas: any[] | undefined,
  filter: StatusFilter,
  search: string,
): any[] {
  if (!lojas) return [];
  const q = search.trim().toLowerCase();
  const qDigits = normalizeDigits(search);

  return lojas.filter((l) => {
    if (filter !== "todas" && l.status !== filter) return false;
    if (!q) return true;
    const textMatch =
      normalize(l.nome).includes(q) ||
      normalize(l.slug).includes(q) ||
      normalize(l.cidade).includes(q) ||
      normalize(l.email).includes(q) ||
      normalize(l.telefone).includes(q) ||
      normalize(l.cnpj).includes(q);
    const digitMatch =
      qDigits.length > 0 &&
      (normalizeDigits(l.cnpj).includes(qDigits) ||
        normalizeDigits(l.telefone).includes(qDigits));
    return textMatch || digitMatch;
  });
}
