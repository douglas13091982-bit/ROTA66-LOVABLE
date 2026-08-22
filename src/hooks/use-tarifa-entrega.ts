import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calcularDistanciaDirigindo } from "@/lib/frete.functions";
import { useServerFn } from "@tanstack/react-start";

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

function calcularTarifaPorFaixa(km: number, config: any, faixas: any[]) {
  const base = Number(config.taxa_entrega_base || 0);
  const kmBase = Number(config.km_base || 0);

  if (km <= kmBase) return base;

  const faixa = faixas.find((f) => km <= Number(f.km_ate));
  if (faixa) return Number(faixa.valor);

  const ultima = faixas[faixas.length - 1];
  if (ultima) {
    const adicional = Number(config.adicional_km_excedente || 0);
    const excedente = km - Number(ultima.km_ate);
    return Number(ultima.valor) + excedente * adicional;
  }

  const adicional = Number(config.adicional_km_excedente || 0);
  const excedente = km - kmBase;
  return base + excedente * adicional;
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

  const [config, setConfig] = useState<any>(null);
  const [faixas, setFaixas] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase
        .from("config_frete" as any)
        .select("*")
        .eq("id", "singleton" as any)
        .maybeSingle();
      setConfig(c);

      const { data: f } = await supabase
        .from("config_frete_faixas" as any)
        .select("*")
        .order("km_ate", { ascending: true });
      setFaixas(f || []);
    }
    load();
  }, []);

  const adicionalRetorno = retornoMaquina ? Number(config?.taxa_retorno_maquina || 0) : 0;

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

  // Compatibility mapping
  return { 
    distancia, 
    tarifa, 
    loading,
    // Legacy support
    taxa: tarifa,
    info: { km: distancia },
    setTaxa: () => {},
    adicionalRetorno
  };
}
