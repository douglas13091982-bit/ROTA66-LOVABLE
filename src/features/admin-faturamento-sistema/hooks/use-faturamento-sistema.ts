import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PeriodoFat = "30d" | "90d" | "mes_atual" | "tudo";

export type FaturamentoSistema = {
  mensalidadesPagas: number;
  mensalidadesQtd: number;
  taxasPorPedido: number;
  taxasPorPedidoQtd: number;
  vendasBrutas: number;
  taxasMp: number;
  vendasLiquidas: number;
  vendasQtd: number;
  repassesEntregadores: number;
  repassesQtd: number;
  repassesPendentes: number;
  repassesPendentesQtd: number;
  saldoDevidoEntregadores: number;
  liquidoSistema: number;
};

function inicioPeriodo(p: PeriodoFat): string | null {
  const now = new Date();
  if (p === "tudo") return null;
  if (p === "mes_atual") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return d.toISOString();
  }
  const dias = p === "30d" ? 30 : 90;
  const d = new Date(now.getTime() - dias * 24 * 3600 * 1000);
  return d.toISOString();
}

export function useFaturamentoSistema(periodo: PeriodoFat) {
  return useQuery({
    queryKey: ["admin-faturamento-sistema", periodo],
    queryFn: async (): Promise<FaturamentoSistema> => {
      const desde = inicioPeriodo(periodo);

      // 1) IDs de lojas de teste (para excluir)
      const { data: teste } = await supabase
        .from("lojas")
        .select("id")
        .eq("is_teste", true);
      const testeIds = (teste ?? []).map((l: any) => l.id as string);
      const excluir = (col: string) =>
        testeIds.length ? `${col}=not.in.(${testeIds.join(",")})` : null;

      // 2) Mensalidades pagas
      let mensQ = supabase
        .from("mensalidades_loja")
        .select("valor, pago_em, loja_id", { count: "exact" })
        .eq("pago", true);
      if (desde) mensQ = mensQ.gte("pago_em", desde);
      if (testeIds.length) mensQ = mensQ.not("loja_id", "in", `(${testeIds.join(",")})`);
      const { data: mensRows, count: mensCount } = await mensQ;
      const mensalidadesPagas = (mensRows ?? []).reduce(
        (s: number, r: any) => s + Number(r.valor ?? 0),
        0,
      );

      // 3) Pedidos entregues (taxa por pedido) e vendas MP
      let pedQ = supabase
        .from("pedidos")
        .select(
          "valor_total, taxa_por_pedido_aplicada, taxa_mp, mp_payment_status, status, created_at, loja_id",
        );
      if (desde) pedQ = pedQ.gte("created_at", desde);
      if (testeIds.length) pedQ = pedQ.not("loja_id", "in", `(${testeIds.join(",")})`);
      const { data: pedRows } = await pedQ;
      const pedidos = pedRows ?? [];

      const entregues = pedidos.filter((p: any) => p.status === "entregue");
      const taxasPorPedido = entregues.reduce(
        (s: number, p: any) => s + Number(p.taxa_por_pedido_aplicada ?? 0),
        0,
      );
      const taxasPorPedidoQtd = entregues.filter(
        (p: any) => Number(p.taxa_por_pedido_aplicada ?? 0) > 0,
      ).length;

      const vendasMp = pedidos.filter(
        (p: any) => p.mp_payment_status === "approved",
      );
      const vendasBrutas = vendasMp.reduce(
        (s: number, p: any) => s + Number(p.valor_total ?? 0),
        0,
      );
      const taxasMp = vendasMp.reduce(
        (s: number, p: any) => s + Number(p.taxa_mp ?? 0),
        0,
      );
      const vendasLiquidas = vendasBrutas - taxasMp;

      // 4) Repasses aos entregadores (saques pagos)
      let saqQ = supabase
        .from("entregador_saques")
        .select("valor, pago_em", { count: "exact" })
        .eq("status", "pago");
      if (desde) saqQ = saqQ.gte("pago_em", desde);
      const { data: saqRows, count: saqCount } = await saqQ;
      const repassesEntregadores = (saqRows ?? []).reduce(
        (s: number, r: any) => s + Number(r.valor ?? 0),
        0,
      );

      // 4b) Saques pendentes (solicitados) — o que ainda devo pagar
      const { data: pendRows, count: pendCount } = await supabase
        .from("entregador_saques")
        .select("valor", { count: "exact" })
        .eq("status", "solicitado");
      const repassesPendentes = (pendRows ?? []).reduce(
        (s: number, r: any) => s + Number(r.valor ?? 0),
        0,
      );

      // 4c) Saldo total devido aos entregadores (créditos acumulados)
      const { data: saldoRows } = await supabase
        .from("entregadores_saldo_saque")
        .select("saldo");
      const saldoDevidoEntregadores = (saldoRows ?? []).reduce(
        (s: number, r: any) => s + Number(r.saldo ?? 0),
        0,
      );

      // Líquido do sistema = receita do sistema (mensalidades + taxa por pedido)
      const liquidoSistema = mensalidadesPagas + taxasPorPedido;

      void excluir;
      return {
        mensalidadesPagas,
        mensalidadesQtd: mensCount ?? (mensRows?.length ?? 0),
        taxasPorPedido,
        taxasPorPedidoQtd,
        vendasBrutas,
        taxasMp,
        vendasLiquidas,
        vendasQtd: vendasMp.length,
        repassesEntregadores,
        repassesQtd: saqCount ?? (saqRows?.length ?? 0),
        repassesPendentes,
        repassesPendentesQtd: pendCount ?? (pendRows?.length ?? 0),
        saldoDevidoEntregadores,
        liquidoSistema,
      };
    },
  });
}
