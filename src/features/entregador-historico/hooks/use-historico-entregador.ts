import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTaxaSistema } from "@/hooks/use-taxa-sistema";
import { agregar, calcularInicioJanela } from "../logic/helpers";
import type { PedidoHistorico, Periodo } from "../logic/types";

export function useHistoricoEntregador(periodo: Periodo) {
  const { user } = useAuth();
  const taxaSistema = useTaxaSistema();

  const inicioJanela = useMemo(() => calcularInicioJanela(), []);

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["pedidos-historico", user?.id, inicioJanela.toISOString()],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*, lojas(nome)")
        .eq("entregador_id", user!.id)
        .eq("status", "entregue")
        .gte("updated_at", inicioJanela.toISOString())
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PedidoHistorico[];
    },
  });

  const agregados = useMemo(
    () => agregar(pedidos ?? [], periodo, taxaSistema),
    [pedidos, periodo, taxaSistema]
  );

  return { isLoading, taxaSistema, ...agregados };
}
