import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SOM_BUCKET, type ConfigNotificacaoSom, type SomScope } from "@/lib/notificacao-som";

export function useNotificacaoSom(scope: SomScope = "entregador") {
  const qc = useQueryClient();
  const QK = ["config-notificacao-som", scope];

  const query = useQuery({
    queryKey: QK,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_notificacao_som" as any)
        .select("*")
        .eq("scope", scope)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as ConfigNotificacaoSom | null;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: QK });

  const salvar = async (form: ConfigNotificacaoSom) => {
    if (!form.id) {
      toast.error("Config ainda não carregou");
      return false;
    }
    if (form.volume < 0 || form.volume > 1) {
      toast.error("Volume deve estar entre 0 e 1");
      return false;
    }
    const { error } = await supabase
      .from("config_notificacao_som" as any)
      .update({ ativo: form.ativo, volume: form.volume, vibrar: form.vibrar })
      .eq("id", form.id);
    if (error) {
      toast.error(error.message);
      return false;
    }
    toast.success("Configuração salva");
    invalidate();
    return true;
  };

  const uploadAudio = async (form: ConfigNotificacaoSom, file: File) => {
    if (!form.id) {
      toast.error("Config ainda não carregou");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 2 MB)");
      return;
    }
    const ext = (file.name.split(".").pop() || "mp3").toLowerCase();
    if (ext !== "mp3") {
      toast.error("Use apenas MP3");
      return;
    }
    const path = `som-${scope}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(SOM_BUCKET)
      .upload(path, file, { contentType: file.type || `audio/${ext}`, upsert: false });
    if (upErr) {
      toast.error(upErr.message);
      return;
    }
    const antigo = form.audio_path;
    const { error: updErr } = await supabase
      .from("config_notificacao_som" as any)
      .update({ audio_path: path })
      .eq("id", form.id);
    if (updErr) {
      toast.error(updErr.message);
      return;
    }
    if (antigo) await supabase.storage.from(SOM_BUCKET).remove([antigo]);
    toast.success("Áudio enviado");
    invalidate();
  };

  const removerAudio = async (form: ConfigNotificacaoSom) => {
    if (!form.id || !form.audio_path) return;
    const antigo = form.audio_path;
    const { error } = await supabase
      .from("config_notificacao_som" as any)
      .update({ audio_path: null })
      .eq("id", form.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.storage.from(SOM_BUCKET).remove([antigo]);
    toast.success("Áudio removido");
    invalidate();
  };

  return { ...query, salvar, uploadAudio, removerAudio };
}
