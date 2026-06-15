import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_TTL_MIN = 10;

let cachedTtlMin: number | null = null;
let inflight: Promise<number> | null = null;

/**
 * Lê o TTL (em minutos) que define depois de quanto tempo sem heartbeat
 * um entregador é considerado offline. Faz cache em memória.
 */
export async function getEntregadorOnlineTtlMin(): Promise<number> {
  if (cachedTtlMin != null) return cachedTtlMin;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data } = await supabase
      .from("config_roteirizacao")
      .select("entregador_online_ttl_min")
      .eq("singleton", true)
      .maybeSingle();
    cachedTtlMin = data?.entregador_online_ttl_min ?? DEFAULT_TTL_MIN;
    return cachedTtlMin;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/**
 * Considera o entregador online APENAS se a flag `online=true` no banco
 * E o `updated_at` (último heartbeat) estiver dentro do TTL.
 * Isso detecta automaticamente quando o app do entregador foi fechado
 * ou ficou sem rede sem chegar a registrar offline.
 */
export function isEffectivelyOnline(
  online: boolean | null | undefined,
  updatedAt: string | null | undefined,
  ttlMinutes: number,
  now: number = Date.now()
): boolean {
  if (!online) return false;
  if (!updatedAt) return false;
  const ts = new Date(updatedAt).getTime();
  if (Number.isNaN(ts)) return false;
  return now - ts <= ttlMinutes * 60_000;
}

/**
 * Hook que devolve o TTL atual e um `tick` que muda a cada `intervalMs`
 * para forçar re-render — assim entregadores ficam offline visualmente
 * mesmo sem evento do realtime quando o heartbeat para.
 */
export function useOnlineTtlTicker(intervalMs = 20_000) {
  const [ttlMin, setTtlMin] = useState<number>(DEFAULT_TTL_MIN);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancel = false;
    getEntregadorOnlineTtlMin().then((v) => {
      if (!cancel) setTtlMin(v);
    });
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return { ttlMin, tick };
}
