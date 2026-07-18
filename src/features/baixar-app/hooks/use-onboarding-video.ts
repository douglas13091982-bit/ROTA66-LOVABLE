import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OnboardingVideo = {
  id: string;
  titulo: string;
  descricao: string | null;
  youtube_url: string;
};

export function useOnboardingVideoEntregador(enabled = true) {
  return useQuery({
    queryKey: ["onboarding-video-entregador"],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treinamento_videos" as any)
        .select("id, titulo, descricao, youtube_url")
        .eq("ativo", true)
        .eq("onboarding_entregador", true)
        .order("ordem", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as OnboardingVideo | null;
    },
  });
}
