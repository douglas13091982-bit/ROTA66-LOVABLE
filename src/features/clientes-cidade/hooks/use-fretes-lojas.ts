import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/geo";
import { calcularTarifaPorFaixa } from "@/lib/tarifa-calculator";
import type { TarifaFaixa } from "@/types/pedido";
import type { LojaPublica } from "../logic/types";

type ClienteCoords = { lat: number; lng: number } | null;

export type FreteInfo = {
  valor: number;
  km: number;
};

/**
 * Para cada loja, calcula o frete usando:
 *   - endereço do cliente (profile.endereco_lat/lng)
 *   - endereço da loja (loja.endereco_lat/lng)
 *   - tarifas globais por faixa de km
 *
 * Retorna Map<lojaId, FreteInfo | null>. null = sem dados suficientes.
 */
export function useFretesLojas(lojas: LojaPublica[]) {
  const [cliente, setCliente] = useState<ClienteCoords>(null);
  const [tarifas, setTarifas] = useState<TarifaFaixa[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCarregando(true);
      const [{ data: auth }, tarifasRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("tarifas_globais")
          .select("faixa_km_min, faixa_km_max, valor, valor_minimo, valor_por_km")
          .eq("ativa", true)
          .eq("tipo_veiculo", "moto")
          .order("faixa_km_min", { ascending: true }),
      ]);
      if (cancelled) return;
      setTarifas((tarifasRes.data ?? []) as TarifaFaixa[]);

      if (auth.user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("endereco_lat, endereco_lng")
          .eq("id", auth.user.id)
          .maybeSingle();
        if (cancelled) return;
        const lat = (prof as any)?.endereco_lat;
        const lng = (prof as any)?.endereco_lng;
        if (typeof lat === "number" && typeof lng === "number") {
          setCliente({ lat, lng });
        } else {
          setCliente(null);
        }
      } else {
        setCliente(null);
      }
      setCarregando(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fretes = new Map<string, FreteInfo | null>();
  if (cliente && tarifas.length > 0) {
    for (const l of lojas) {
      if (l.endereco_lat == null || l.endereco_lng == null) {
        fretes.set(l.id, null);
        continue;
      }
      const km = haversineKm(
        { lat: l.endereco_lat, lng: l.endereco_lng },
        cliente,
      );
      const valor = calcularTarifaPorFaixa(km, tarifas);
      if (valor == null) {
        fretes.set(l.id, null);
        continue;
      }
      fretes.set(l.id, { valor: Number(valor.toFixed(2)), km });
    }
  }

  return {
    fretes,
    temEndereco: !!cliente,
    carregando,
  };
}
