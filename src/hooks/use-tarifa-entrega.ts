/**
 * Hook: calcula taxa de entrega automaticamente quando as coordenadas mudam.
 * Usa exclusivamente as tarifas globais definidas pelo Super Admin.
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

function coordsValidas(c: Coords): c is LatLng {
  return c.lat != null && c.lng != null;
}

export function useTarifaEntrega(
  _lojaId: string,
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
      const tarifas = await buscarTarifas();
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
          `${km.toFixed(1)} km · faixa ${faixa.faixa_km_min}–${faixa.faixa_km_max} km · tarifas globais`,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coleta.lat, coleta.lng, entrega.lat, entrega.lng]);

  return { taxa, info, setTaxa };
}
