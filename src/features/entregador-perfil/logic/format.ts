export function formatTempo(createdAt: string | null | undefined) {
  if (!createdAt) return "—";
  const d = new Date(createdAt);
  const diffMs = Date.now() - d.getTime();
  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (dias < 30) return `${dias}d`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `${meses}m`;
  const anos = Math.floor(meses / 12);
  return `${anos}a`;
}

export function formatIdCurto(userId: string | undefined | null) {
  if (!userId) return "—";
  const s = userId.replace(/-/g, "").toUpperCase();
  return `R66-${s.slice(0, 4)}-${s.slice(-1)}`;
}
