/**
 * Hook: calcula taxa de entrega automaticamente quando as coordenadas mudam.
 *
 * Modelo:
 *   taxa_entrega (paga pelo cliente) = tarifa_global_por_km + taxa_por_pedido_loja
 *
 * O entregador recebe apenas a tarifa global (frete). A taxa por pedido do
 * plano fica retida com a loja para repassar ao sistema.
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
    .order("faixa_km_min", { ascending: true });
  return (data ?? []) as TarifaFaixa[];
}

async function buscarTaxaPlanoLoja(
  lojaId: string,
): Promise<{ taxa: number; planoMensalAtivo: boolean }> {
  if (!lojaId) return { taxa: 0, planoMensalAtivo: false };
  // Tenta primeiro a view pública (acessível a anônimos no catálogo)
  let data: any = null;
  const pub = await (supabase as any)
    .from("lojas_publicas")
    .select("taxa_por_pedido, plano_mensal_ativo")
    .eq("id", lojaId)
    .maybeSingle();
  data = pub.data;
  if (!data) {
    const r = await supabase
      .from("lojas")
      .select("taxa_por_pedido, plano_mensal_ativo")
      .eq("id", lojaId)
      .maybeSingle();
    data = r.data;
  }
  return {
    taxa: Number((data as any)?.taxa_por_pedido ?? 0) || 0,
    planoMensalAtivo: Boolean((data as any)?.plano_mensal_ativo),
  };
}

async function buscarAdicionalRetornoPorKm(): Promise<number> {
  const { data } = await (supabase as any).rpc("get_retorno_cartao_por_km");
  return Number(data ?? 0) || 0;
}

function coordsValidas(c: Coords): c is LatLng {
  return c.lat != null && c.lng != null;
}

export function useTarifaEntrega(
  lojaId: string,
  coleta: Coords,
  entrega: Coords,
  retornoMaquina = false,
) {
  const [taxa, setTaxa] = useState<number>(0);
  const [info, setInfo] = useState<string | null>(null);
  const [adicionalRetorno, setAdicionalRetorno] = useState<number>(0);

  useEffect(() => {
    if (!coordsValidas(coleta) || !coordsValidas(entrega)) {
      setTaxa(0);
      setInfo(null);
      setAdicionalRetorno(0);
      return;
    }

    let cancelled = false;
    (async () => {
      const km = haversineKm(coleta, entrega);
      const [tarifas, plano, valorPorKmRetorno] = await Promise.all([
        buscarTarifas(),
        buscarTaxaPlanoLoja(lojaId),
        retornoMaquina ? buscarAdicionalRetornoPorKm() : Promise.resolve(0),
      ]);
      if (cancelled) return;
      if (tarifas.length === 0) {
        setTaxa(0);
        setInfo(null);
        setAdicionalRetorno(0);
        return;
      }

      const valorGlobal = calcularTarifaPorFaixa(km, tarifas);
      if (valorGlobal == null) {
        setTaxa(0);
        setInfo(null);
        setAdicionalRetorno(0);
        return;
      }

      const taxaPlano = plano.taxa;
      // Retorno com máquina: distância loja→cliente × valor por km do menu
      // Tarifas do admin. Cobrado do cliente e repassado ao entregador.
      const adicional = retornoMaquina
        ? Number((km * valorPorKmRetorno).toFixed(2))
        : 0;
      const total = Number((valorGlobal + taxaPlano + adicional).toFixed(2));
      const faixa = encontrarFaixa(km, tarifas);
      setAdicionalRetorno(adicional);
      setTaxa(total);
      if (faixa) {
        const sufixoPlano =
          taxaPlano > 0
            ? ` + R$ ${taxaPlano.toFixed(2)} da taxa por pedido da loja`
            : "";
        const sufixoRetorno =
          adicional > 0
            ? ` + R$ ${adicional.toFixed(2)} de retorno com máquina (${km.toFixed(1)} km × R$ ${valorPorKmRetorno.toFixed(2)})`
            : "";
        setInfo(
          `${km.toFixed(1)} km · faixa ${faixa.faixa_km_min}–${faixa.faixa_km_max} km · frete R$ ${valorGlobal.toFixed(2)}${sufixoPlano}${sufixoRetorno}`,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lojaId, coleta.lat, coleta.lng, entrega.lat, entrega.lng, retornoMaquina]);

  return { taxa, info, setTaxa, adicionalRetorno };
}

