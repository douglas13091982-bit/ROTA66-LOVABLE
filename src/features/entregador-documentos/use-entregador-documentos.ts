import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { fileToWebp } from "@/lib/image-to-webp";

export type DocStatus = "pendente" | "enviado" | "aprovado" | "rejeitado";
export type TipoVeiculo = "moto" | "carro" | "bike_eletrica";

export type EntregadorDocumentos = {
  id: string;
  entregador_id: string;
  tipo_veiculo: TipoVeiculo;
  cnh_path: string | null;
  placa: string | null;
  veiculo_foto_path: string | null;
  status: DocStatus;
  motivo_rejeicao: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
};

const BUCKET = "entregador-documentos";

export function useEntregadorDocumentos() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["entregador-documentos", userId],
    enabled: !!userId,
    refetchInterval: 30_000,
    queryFn: async (): Promise<EntregadorDocumentos | null> => {
      const { data } = await (supabase as any)
        .from("entregador_documentos")
        .select("*")
        .eq("entregador_id", userId!)
        .maybeSingle();
      return data ?? null;
    },
  });

  const upload = async (file: File, prefixo: "cnh" | "veiculo"): Promise<string> => {
    if (!userId) throw new Error("Sem usuário");
    const webp = await fileToWebp(file, { maxDim: 1600, quality: 0.82 }).catch(() => file);
    const path = `${userId}/${prefixo}-${Date.now()}.webp`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, webp, {
      upsert: true,
      contentType: "image/webp",
    });
    if (error) throw error;
    return path;
  };

  const submit = useMutation({
    mutationFn: async (payload: { cnhFile?: File | null; placa: string; veiculoFile?: File | null }) => {
      if (!userId || !data) throw new Error("Sem registro de documentos");
      const cnhPath = payload.cnhFile ? await upload(payload.cnhFile, "cnh") : data.cnh_path;
      const veiculoPath = payload.veiculoFile ? await upload(payload.veiculoFile, "veiculo") : data.veiculo_foto_path;
      if (!cnhPath) throw new Error("CNH é obrigatória");
      if (!veiculoPath) throw new Error("Foto do veículo é obrigatória");
      if (!payload.placa?.trim()) throw new Error("Placa é obrigatória");
      const { error } = await (supabase as any)
        .from("entregador_documentos")
        .update({
          cnh_path: cnhPath,
          veiculo_foto_path: veiculoPath,
          placa: payload.placa.trim().toUpperCase(),
          status: "enviado",
          motivo_rejeicao: null,
        })
        .eq("entregador_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documentos enviados! Aguarde a aprovação.");
      qc.invalidateQueries({ queryKey: ["entregador-documentos", userId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível enviar os documentos"),
  });

  const docsAprovados = !data
    ? false
    : data.tipo_veiculo === "bike_eletrica" || data.status === "aprovado";

  return { data, isLoading, submit: submit.mutateAsync, enviando: submit.isPending, docsAprovados };
}

export async function getSignedDocUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}
