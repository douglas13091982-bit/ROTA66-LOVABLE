import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TreinamentoVideo = {
  id: string;
  titulo: string;
  descricao: string | null;
  youtube_url: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export function useTreinamentoVideos(opts: { includeInactive?: boolean } = {}) {
  const { includeInactive = false } = opts;
  return useQuery({
    queryKey: ["treinamento-videos", { includeInactive }],
    queryFn: async () => {
      let q = supabase
        .from("treinamento_videos" as any)
        .select("*")
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: false });
      if (!includeInactive) q = q.eq("ativo", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as TreinamentoVideo[];
    },
  });
}

export type TreinamentoInput = {
  titulo: string;
  descricao?: string | null;
  youtube_url: string;
  ordem?: number;
  ativo?: boolean;
};

export function useSalvarTreinamentoVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TreinamentoInput & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase
          .from("treinamento_videos" as any)
          .update(rest as any)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("treinamento_videos" as any)
          .insert(input as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treinamento-videos"] });
      toast.success("Vídeo salvo");
    },
    onError: (e: any) => toast.error("Erro ao salvar", { description: e.message }),
  });
}

export function useExcluirTreinamentoVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("treinamento_videos" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treinamento-videos"] });
      toast.success("Vídeo excluído");
    },
    onError: (e: any) => toast.error("Erro ao excluir", { description: e.message }),
  });
}
