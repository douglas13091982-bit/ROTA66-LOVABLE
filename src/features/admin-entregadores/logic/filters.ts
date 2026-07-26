import type { EntregadorRow, StatusFilter } from "./types";

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

/** Cadastros anteriores a esta data precisam atualizar o APK e enviar documentos. */
const CORTE_APK = Date.parse("2026-07-19T00:00:00Z");

export function precisaAtualizarApp(createdAt?: string | null) {
  const t = Date.parse(createdAt ?? "");
  return Number.isFinite(t) && t < CORTE_APK;
}

export function mensagemAprovacao(
  nome: string | null,
  createdAt?: string | null,
  docsPendentes?: boolean,
) {
  const primeiro = (nome ?? "").trim().split(/\s+/)[0] || "Entregador";
  const base =
    `🎉 Parabéns, ${primeiro}! ` +
    `Seu cadastro na Rota 66 foi *APROVADO*! ✅\n\n`;

  if (docsPendentes || precisaAtualizarApp(createdAt)) {
    return (
      base +
      `⚠️ *Atenção:* como você se cadastrou antes da atualização, faça estes 2 passos para liberar seus pedidos:\n\n` +
      `1️⃣ Baixe e instale a *nova versão do aplicativo* em: https://rotas66.lovable.app/baixar-app\n` +
      `2️⃣ No app, vá em *Perfil > Documentação* e envie seus documentos para aprovação.\n\n` +
      `Assim que a documentação for aprovada você já começa a receber pedidos. ` +
      `Qualquer dúvida é só chamar por aqui. Boas entregas! 🛵💨`
    );
  }

  return (
    base +
    `Já pode abrir o app e começar a receber pedidos. ` +
    `Qualquer dúvida é só chamar por aqui. Boas entregas! 🛵💨`
  );
}


export function filtrarEntregadores(
  list: EntregadorRow[],
  filter: StatusFilter,
  search: string
): EntregadorRow[] {
  const normalize = (s: any) => String(s ?? "").toLowerCase();
  const normalizeDigits = (s: any) => String(s ?? "").replace(/\D/g, "");
  const q = search.trim().toLowerCase();
  const qDigits = normalizeDigits(search);

  return list.filter((p) => {
    if (filter !== "todas" && p.status !== filter) return false;
    if (!q) return true;
    const textMatch =
      normalize(p.full_name).includes(q) ||
      normalize(p.email).includes(q) ||
      normalize(p.phone).includes(q);
    const digitMatch = qDigits.length > 0 && normalizeDigits(p.phone).includes(qDigits);
    return textMatch || digitMatch;
  });
}
