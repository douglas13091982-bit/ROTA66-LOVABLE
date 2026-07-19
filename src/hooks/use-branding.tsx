import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import fallbackLogo from "@/assets/rota66-logo.webp";

export type Branding = {
  id?: string;
  logo_data_url: string | null;
  nome_sistema: string;
  suporte_whatsapp?: string | null;
  suporte_horario?: string | null;
  updated_at?: string | null;
} | null;

export const BRANDING_CACHE_KEY = "branding-cache-v1";

function readCache(): Branding {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BRANDING_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Branding) : null;
  } catch {
    return null;
  }
}

export function writeBrandingCache(data: Branding) {
  if (typeof window === "undefined") return;
  try {
    if (data) window.localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(data));
    else window.localStorage.removeItem(BRANDING_CACHE_KEY);
  } catch {
    /* noop */
  }
}

export function useBranding() {
  const [cachedData, setCachedData] = useState<Branding>(null);
  const { data } = useQuery<Branding>({
    queryKey: ["config-branding"],
    // Branding raramente muda. Mantém em cache por 10min e revalida
    // em background sem bloquear a navegação.
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("config_branding")
        .select("id,logo_data_url,nome_sistema,suporte_whatsapp,suporte_horario,updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Branding;
    },
  });

  // Lê o cache somente depois da hidratação para não travar a imagem antiga
  // por diferença entre HTML do servidor e HTML do navegador.
  useEffect(() => {
    setCachedData(readCache());
  }, []);

  // Persiste o branding recebido para os próximos carregamentos.
  useEffect(() => {
    if (data !== undefined) writeBrandingCache(data ?? null);
  }, [data]);

  const branding = data ?? cachedData;

  return {
    logoUrl: branding?.logo_data_url || fallbackLogo,
    nomeSistema: branding?.nome_sistema || "ROTA 66",
    suporteWhatsapp: branding?.suporte_whatsapp || "",
    suporteHorario: branding?.suporte_horario || "",
  };
}
