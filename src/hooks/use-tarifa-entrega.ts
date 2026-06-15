/**
 * Hook: calcula taxa de entrega automaticamente quando as coordenadas mudam.
 * Usa tarifas da loja se ela tem plano mensal ativo, senão tarifas globais.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm, type LatLng } from "@/lib/geo";
import { calcularTarifaPorFaixa, encontrarFaixa } from "@/lib/tarifa-calculator";
import type { TarifaFaixa } from "@/types/pedido";

type Coords = { lat: number | null; lng: number | null };

async function buscarTarifasDaLoja(lojaId: string): Promise<{
  tarifas: TarifaFaixa[];
  origem: string;
}> {
  const { data: lojaData } = await supabase
    .from("lojas")
    .select("plano_mensal_ativo")
    .eq("id", lojaId)
    .maybeSingle();

  if (lojaData?.plano_mensal_ativo) {
    const { data } = await supabase
      .from("tarifas_loja")
      .select("faixa_km_min, faixa_km_max, valor, valor_minimo, valor_por_km")
      .eq("loja_id", lojaId)
      .eq("ativa", true)
      .eq("tipo_veiculo", "moto")
      .order("faixa_km_min", { ascending: true });
    if (data && data.length > 0) {
      return { tarifas: data as TarifaFaixa[], origem: "tarifas da loja" };
    }
  }

  const { data: globais } = await supabase
    .from("tarifas_globais")
    .select("faixa_km_min, faixa_km_max, valor, valor_minimo, valor_por_km")
    .eq("ativa", true)
    .eq("tipo_veiculo", "moto")
    .order("faixa_km_min", { ascending: true });
  return { tarifas: (globais ?? []) as TarifaFaixa[], origem: "tarifas globais" };
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
      const { tarifas, origem } = await buscarTarifasDaLoja(lojaId);
      if (cancelled) return;
      if (tarifas.length === 0) {
        setTaxa(0);
        setInfo(null);
        return;
      }

      const valor = calcularTarifaPorFaixa(km, tarifas);
      if (valor == null) {
        setTaxa(0);
        setInfo(null);
        return;
      }

      const faixa = encontrarFaixa(km, tarifas);
      setTaxa(Number(valor.toFixed(2)));
      if (faixa) {
        setInfo(
          `${km.toFixed(1)} km · faixa ${faixa.faixa_km_min}–${faixa.faixa_km_max} km · ${origem}`,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coleta.lat, coleta.lng, entrega.lat, entrega.lng, lojaId]);

  return { taxa, info, setTaxa };
}
