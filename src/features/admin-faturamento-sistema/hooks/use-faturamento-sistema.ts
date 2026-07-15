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
  saldoAtualLojas: number;
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

export function useFaturamentoSistema(periodo: PeriodoFat, cidade?: string | null) {
  return useQuery({
    queryKey: ["admin-faturamento-sistema", periodo, cidade ?? "__all__"],
    queryFn: async (): Promise<FaturamentoSistema> => {
      const desde = inicioPeriodo(periodo);

      // 1) IDs de lojas: excluir teste; se cidade filtrada, restringir a ela
      let lojasQ = supabase.from("lojas").select("id, is_teste, cidade");
      if (cidade) lojasQ = lojasQ.eq("cidade", cidade);
      const { data: lojasAll } = await lojasQ;
      const testeIds = (lojasAll ?? [])
        .filter((l: any) => l.is_teste)
        .map((l: any) => l.id as string);
      const lojasIds = (lojasAll ?? [])
        .filter((l: any) => !l.is_teste)
        .map((l: any) => l.id as string);

      // Helper para restringir por lojas quando houver filtro de cidade
      const restringirLojas = <T extends { in: any; not: any }>(q: T): T => {
        if (cidade) {
          if (lojasIds.length === 0) return q.in("loja_id" as any, ["00000000-0000-0000-0000-000000000000"]) as T;
          return q.in("loja_id" as any, lojasIds) as T;
        }
        if (testeIds.length) return q.not("loja_id" as any, "in", `(${testeIds.join(",")})`) as T;
        return q;
      };

      // 2) Entregadores da cidade (para filtrar saques/saldo quando cidade)
      let entregadorIds: string[] | null = null;
      if (cidade) {
        const { data: cidadeRow } = await supabase
          .from("cidades")
          .select("id")
          .eq("nome", cidade)
          .maybeSingle();
        const cityId = (cidadeRow as any)?.id ?? null;
        if (cityId) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id")
            .eq("city_id", cityId);
          entregadorIds = (profs ?? []).map((p: any) => p.id as string);
        } else {
          entregadorIds = [];
        }
      }

      // 3) Mensalidades pagas
      let mensQ = supabase
        .from("mensalidades_loja")
        .select("valor, pago_em, loja_id", { count: "exact" })
        .eq("pago", true);
      if (desde) mensQ = mensQ.gte("pago_em", desde);
      mensQ = restringirLojas(mensQ as any);
      const { data: mensRows, count: mensCount } = await mensQ;
      const mensalidadesPagas = (mensRows ?? []).reduce(
        (s: number, r: any) => s + Number(r.valor ?? 0),
        0,
      );

      // 4) Pedidos entregues (taxa por pedido) e vendas MP
      let pedQ = supabase
        .from("pedidos")
        .select(
          "valor_total, taxa_por_pedido_aplicada, taxa_mp, mp_payment_status, status, created_at, loja_id",
        );
      if (desde) pedQ = pedQ.gte("created_at", desde);
      pedQ = restringirLojas(pedQ as any);
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

      // 5) Repasses aos entregadores (saques pagos)
      let saqQ = supabase
        .from("entregador_saques")
        .select("valor, pago_em, entregador_id", { count: "exact" })
        .eq("status", "pago");
      if (desde) saqQ = saqQ.gte("pago_em", desde);
      if (entregadorIds) {
        if (entregadorIds.length === 0) saqQ = saqQ.eq("entregador_id", "00000000-0000-0000-0000-000000000000");
        else saqQ = saqQ.in("entregador_id", entregadorIds);
      }
      const { data: saqRows, count: saqCount } = await saqQ;
      const repassesEntregadores = (saqRows ?? []).reduce(
        (s: number, r: any) => s + Number(r.valor ?? 0),
        0,
      );

      // 5b) Saques pendentes
      let pendQ = supabase
        .from("entregador_saques")
        .select("valor, entregador_id", { count: "exact" })
        .eq("status", "solicitado");
      if (entregadorIds) {
        if (entregadorIds.length === 0) pendQ = pendQ.eq("entregador_id", "00000000-0000-0000-0000-000000000000");
        else pendQ = pendQ.in("entregador_id", entregadorIds);
      }
      const { data: pendRows, count: pendCount } = await pendQ;
      const repassesPendentes = (pendRows ?? []).reduce(
        (s: number, r: any) => s + Number(r.valor ?? 0),
        0,
      );

      // 5c) Saldo devido aos entregadores
      let saldoEntQ = supabase.from("entregadores_saldo_saque").select("saldo, entregador_id");
      if (entregadorIds) {
        if (entregadorIds.length === 0) saldoEntQ = saldoEntQ.eq("entregador_id", "00000000-0000-0000-0000-000000000000");
        else saldoEntQ = saldoEntQ.in("entregador_id", entregadorIds);
      }
      const { data: saldoRows } = await saldoEntQ;
      const saldoDevidoEntregadores = (saldoRows ?? []).reduce(
        (s: number, r: any) => s + Number(r.saldo ?? 0),
        0,
      );

      // 6) Saldo atual consolidado das lojas
      let saldoLojasQ = supabase.from("lojas_saldo").select("saldo, loja_id");
      saldoLojasQ = restringirLojas(saldoLojasQ as any);
      const { data: saldoLojasRows } = await saldoLojasQ;
      const saldoAtualLojas = (saldoLojasRows ?? []).reduce(
        (s: number, r: any) => s + Number(r.saldo ?? 0),
        0,
      );

      const liquidoSistema = mensalidadesPagas + taxasPorPedido;

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
        saldoAtualLojas,
        liquidoSistema,
      };
    },
  });
}
