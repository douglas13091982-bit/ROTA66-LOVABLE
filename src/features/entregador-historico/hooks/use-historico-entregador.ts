import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { agregar, calcularInicioJanela } from "../logic/helpers";
import type { PedidoHistorico, Periodo } from "../logic/types";

export function useHistoricoEntregador(periodo: Periodo) {
  const { user } = useAuth();

  const inicioJanela = useMemo(() => calcularInicioJanela(), []);

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["pedidos-historico", user?.id, inicioJanela.toISOString()],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*, lojas(nome, plano_mensal_ativo, taxa_por_pedido)")
        .eq("entregador_id", user!.id)
        .eq("status", "entregue")
        .gte("updated_at", inicioJanela.toISOString())
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        ...p,
        loja_plano_mensal_ativo: !!p.lojas?.plano_mensal_ativo,
        loja_taxa_por_pedido: Number(p.lojas?.taxa_por_pedido ?? 0),
      })) as PedidoHistorico[];
    },
  });

  const agregados = useMemo(
    () => agregar(pedidos ?? [], periodo),
    [pedidos, periodo]
  );

  return { isLoading, ...agregados };
}
