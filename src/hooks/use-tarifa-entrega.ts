/**
 * Hook: calcula taxa de entrega automaticamente quando as coordenadas mudam.
 *
 * Modelo:
 *   taxa_entrega = tarifa_global_por_km + taxa_por_pedido_do_plano
 *
 * A taxa do plano é somada ao que o cliente paga (loja repassa ao sistema
 * depois via cobrancas_loja). Lojas com plano mensal ativo não somam nada.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm, type LatLng } from "@/lib/geo";
import { calcularTarifaPorFaixa, encontrarFaixa } from "@/lib/tarifa-calculator";
import type { TarifaFaixa } from "@/types/pedido";

type Coords = { lat: number | null; lng: number | null };

async function buscarTarifas(): Promise<TarifaFaixa[]> {
  const { data } = await supabase
    .from("tarifas_globais")
    .select("faixa_km_min, faixa_km_max, valor, valor_minimo, valor_por_km")
    .eq("ativa", true)
    .eq("tipo_veiculo", "moto")
    .order("faixa_km_min", { ascending: true });
  return (data ?? []) as TarifaFaixa[];
}

async function buscarTaxaPlanoLoja(
  lojaId: string,
): Promise<{ taxa: number; planoMensalAtivo: boolean }> {
  if (!lojaId) return { taxa: 0, planoMensalAtivo: false };
  const { data } = await supabase
    .from("lojas")
    .select("taxa_por_pedido, plano_mensal_ativo")
    .eq("id", lojaId)
    .maybeSingle();
  return {
    taxa: Number((data as any)?.taxa_por_pedido ?? 0) || 0,
    planoMensalAtivo: Boolean((data as any)?.plano_mensal_ativo),
  };
}

function coordsValidas(c: Coords): c is LatLng {
  return c.lat != null && c.lng != null;
}

export function useTarifaEntrega(
  lojaId: string,
  coleta: Coords,
  entrega: Coords,
) {
  const [taxa, setTaxa] = useState<number>(0);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!coordsValidas(coleta) || !coordsValidas(entrega)) {
      setTaxa(0);
      setInfo(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const km = haversineKm(coleta, entrega);
      const [tarifas, plano] = await Promise.all([
        buscarTarifas(),
        buscarTaxaPlanoLoja(lojaId),
      ]);
      if (cancelled) return;
      if (tarifas.length === 0) {
        setTaxa(0);
        setInfo(null);
        return;
      }

      const valorGlobal = calcularTarifaPorFaixa(km, tarifas);
      if (valorGlobal == null) {
        setTaxa(0);
        setInfo(null);
        return;
      }

      const adicionalPlano = plano.planoMensalAtivo ? 0 : plano.taxa;
      const total = Number((valorGlobal + adicionalPlano).toFixed(2));
      const faixa = encontrarFaixa(km, tarifas);
      setTaxa(total);
      if (faixa) {
        const sufixoPlano =
          adicionalPlano > 0
            ? ` + R$ ${adicionalPlano.toFixed(2)} taxa do plano`
            : "";
        setInfo(
          `${km.toFixed(1)} km · faixa ${faixa.faixa_km_min}–${faixa.faixa_km_max} km · tarifas globais${sufixoPlano}`,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lojaId, coleta.lat, coleta.lng, entrega.lat, entrega.lng]);

  return { taxa, info, setTaxa };
}
