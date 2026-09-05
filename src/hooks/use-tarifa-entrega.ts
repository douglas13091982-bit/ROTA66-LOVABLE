import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calcularDistanciaDirigindo } from "@/lib/frete.functions";
import { useServerFn } from "@tanstack/react-start";
import { calcularTarifaPorFaixa } from "@/lib/tarifa-calculator";
import type { TarifaFaixa } from "@/types/pedido";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useTarifaEntrega(
  lojaIdOrOrigem: string | { lat: number; lng: number } | null,
  origemOrDestino: { lat: number | null; lng: number | null } | null,
  destinoOrRetorno: { lat: number | null; lng: number | null } | null,
  retornoMaquinaParam?: boolean
) {
  // Overload detection
  const isLegacy = typeof lojaIdOrOrigem === "string";

  const origem = (isLegacy ? origemOrDestino : lojaIdOrOrigem) as { lat: number; lng: number } | null;
  const destino = (isLegacy ? destinoOrRetorno : origemOrDestino) as { lat: number; lng: number } | null;
  const retornoMaquina = isLegacy ? retornoMaquinaParam : (destinoOrRetorno as unknown as boolean);

  const [distancia, setDistancia] = useState<number | null>(null);
  const [tarifa, setTarifa] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const runCalcularDistancia = useServerFn(calcularDistanciaDirigindo);

  const [faixas, setFaixas] = useState<TarifaFaixa[]>([]);
  const [retornoPorKm, setRetornoPorKm] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [tarifasRes, retornoRes] = await Promise.all([
        supabase
          .from("tarifas_globais")
          .select("faixa_km_min, faixa_km_max, valor, valor_minimo, valor_por_km")
          .eq("ativa", true)
          .eq("tipo_veiculo", "moto")
          .order("faixa_km_min", { ascending: true }),
        supabase.rpc("get_retorno_cartao_por_km" as any),
      ]);
      if (cancelled) return;
      setFaixas((tarifasRes.data ?? []) as unknown as TarifaFaixa[]);
      setRetornoPorKm(Number(retornoRes.data ?? 0) || 0);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const adicionalRetorno =
    retornoMaquina && distancia != null
      ? Number((retornoPorKm * distancia).toFixed(2))
      : 0;

  useEffect(() => {
    async function calculate() {
      if (!origem?.lat || !origem?.lng || !destino?.lat || !destino?.lng) {
        setDistancia(null);
        setTarifa(0);
        return;
      }

      setLoading(true);
      try {
        const res = await runCalcularDistancia({ 
          data: { 
            origem: { lat: origem.lat, lng: origem.lng }, 
            destino: { lat: destino.lat, lng: destino.lng } 
          } 
        });
        
        let km = res.km;

        if (km === null || km === undefined) {
          km = haversineKm(origem.lat, origem.lng, destino.lat, destino.lng);
        }

        setDistancia(km);

        if (!config?.taxa_entrega_base) {
          setTarifa(0);
          return;
        }

        const t = calcularTarifaPorFaixa(km, config, faixas);
        setTarifa(t + adicionalRetorno);
      } catch (err) {
        console.error("[use-tarifa-entrega] Error:", err);
        const km = haversineKm(origem.lat, origem.lng, destino.lat, destino.lng);
        setDistancia(km);
        setTarifa(calcularTarifaPorFaixa(km, config, faixas) + adicionalRetorno);
      } finally {
        setLoading(false);
      }
    }

    calculate();
  }, [origem?.lat, origem?.lng, destino?.lat, destino?.lng, config, faixas, runCalcularDistancia, adicionalRetorno]);

  const infoText = distancia != null ? `${distancia.toFixed(1)} km` : "";

  return { 
    distancia, 
    tarifa, 
    loading,
    // Legacy support
    taxa: tarifa,
    info: infoText || "---", // Changed to string to satisfy UI components
    setTaxa: () => {},
    adicionalRetorno
  };
}
