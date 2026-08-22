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

  // Busca a primeira faixa que cubra este KM
  const faixa = faixas.find((f) => km <= Number(f.km_ate));
  if (faixa) return Number(faixa.valor);

  // Se exceder a última faixa, cobrar adicional por KM excedente da última faixa
  const ultima = faixas[faixas.length - 1];
  if (ultima) {
    const adicional = Number(config.adicional_km_excedente || 0);
    const excedente = km - Number(ultima.km_ate);
    return Number(ultima.valor) + excedente * adicional;
  }

  // Fallback se não houver faixas: base + excedente do km_base
  const adicional = Number(config.adicional_km_excedente || 0);
  const excedente = km - kmBase;
  return base + excedente * adicional;
}

export function useTarifaEntrega(
  origem: { lat: number; lng: number } | null,
  destino: { lat: number; lng: number } | null,
) {
  const [distancia, setDistancia] = useState<number | null>(null);
  const [tarifa, setTarifa] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const runCalcularDistancia = useServerFn(calcularDistanciaDirigindo);

  const [config, setConfig] = useState<any>(null);
  const [faixas, setFaixas] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase
        .from("config_frete")
        .select("*")
        .eq("id", "singleton" as any)
        .maybeSingle();
      setConfig(c);

      const { data: f } = await supabase
        .from("config_frete_faixas")
        .select("*")
        .order("km_ate", { ascending: true });
      setFaixas(f || []);
    }
    load();
  }, []);

  useEffect(() => {
    async function calculate() {
      if (!origem || !destino) {
        setDistancia(null);
        setTarifa(0);
        return;
      }

      setLoading(true);
      try {
        const res = await runCalcularDistancia({ data: { origem, destino } });
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
        setTarifa(t);
      } catch (err) {
        console.error("[use-tarifa-entrega] Error:", err);
        const km = haversineKm(origem.lat, origem.lng, destino.lat, destino.lng);
        setDistancia(km);
        setTarifa(calcularTarifaPorFaixa(km, config, faixas));
      } finally {
        setLoading(false);
      }
    }

    calculate();
  }, [origem?.lat, origem?.lng, destino?.lat, destino?.lng, config, faixas, runCalcularDistancia]);

  return { distancia, tarifa, loading };
}
