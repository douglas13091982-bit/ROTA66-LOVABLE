export type AnuncioRow = {
  id: string;
  titulo: string | null;
  link_url: string | null;
  image_data_url: string;
  ativo: boolean;
  ordem: number | null;
  created_at: string;
  expira_em: string | null;
};

export const ANUNCIO_MAX_BYTES = 800_000;

/** Converte uma quantidade de dias em timestamp ISO de expiração (null = sem prazo). */
export function diasParaExpiracao(dias: number | null): string | null {
  if (!dias || dias <= 0) return null;
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
}

export function anuncioExpirado(expiraEm: string | null, nowMs = Date.now()): boolean {
  if (!expiraEm) return false;
  return new Date(expiraEm).getTime() <= nowMs;
}

export function diasRestantes(expiraEm: string | null, nowMs = Date.now()): number | null {
  if (!expiraEm) return null;
  return Math.ceil((new Date(expiraEm).getTime() - nowMs) / (24 * 60 * 60 * 1000));
}
