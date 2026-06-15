import type { PedidoAtivo } from "./types";

export const norm = (s: string | null | undefined) =>
  (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Agrupa pedidos por (loja + ponto de coleta).
 * Mesma loja + mesma coleta = mesma ida do entregador à loja.
 */
export function agruparPorColeta(pedidos: PedidoAtivo[]): Record<string, PedidoAtivo[]> {
  const rotas = pedidos.reduce<Record<string, PedidoAtivo[]>>((acc, p) => {
    const coletaKey =
      p.endereco_coleta_lat != null && p.endereco_coleta_lng != null
        ? `${Number(p.endereco_coleta_lat).toFixed(4)},${Number(p.endereco_coleta_lng).toFixed(4)}`
        : norm(p.endereco_coleta);
    const key = `addr:${p.loja_id}|${coletaKey}`;
    (acc[key] ||= []).push(p);
    return acc;
  }, {});
  Object.values(rotas).forEach((arr) =>
    arr.sort((a, b) => {
      const oa = a.rota_ordem ?? 999;
      const ob = b.rota_ordem ?? 999;
      if (oa !== ob) return oa - ob;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }),
  );
  return rotas;
}
