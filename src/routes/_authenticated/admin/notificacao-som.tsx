import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Save, Play, Volume2, Upload, Trash2, Music } from "lucide-react";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import {
  DEFAULT_SOM,
  tocarNotificacao,
  precarregarSom,
  desbloquearAudio,
  SOM_BUCKET,
  type ConfigNotificacaoSom,
} from "@/lib/notificacao-som";

export const Route = createFileRoute("/_authenticated/admin/notificacao-som")({
  component: AdminNotificacaoSom,
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
});


function AdminNotificacaoSom() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ConfigNotificacaoSom>(DEFAULT_SOM);

  const { data, isLoading } = useQuery({
    queryKey: ["config-notificacao-som"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_notificacao_som" as any)
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (data) setForm({ ...DEFAULT_SOM, ...data });
  }, [data]);

  // Pré-carrega o MP3 assim que a config chega, para que "Testar" use o arquivo
  // e não caia no beep sintético.
  useEffect(() => {
    if (form.audio_path) {
      precarregarSom({ ...form, ativo: true });
    }
  }, [form.audio_path]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id) {
      toast.error("Config ainda não carregou");
      return;
    }
    if (form.volume < 0 || form.volume > 1) {
      toast.error("Volume deve estar entre 0 e 1");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("config_notificacao_som" as any)
      .update({
        ativo: form.ativo,
        volume: form.volume,
        vibrar: form.vibrar,
      })
      .eq("id", form.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Configuração salva");
    qc.invalidateQueries({ queryKey: ["config-notificacao-som"] });
  };

  const testar = async () => {
    if (!form.audio_path) {
      toast.error("Envie um MP3 primeiro para testar");
      return;
    }
    // Destrava áudio dentro do gesto e garante que o MP3 está carregado.
    desbloquearAudio();
    await precarregarSom({ ...form, ativo: true });
    tocarNotificacao({ ...form, ativo: true });
  };

  const [uploading, setUploading] = useState(false);
  const handleUpload = async (file: File) => {
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
    setUploading(true);
    const path = `som-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(SOM_BUCKET)
      .upload(path, file, { contentType: file.type || `audio/${ext}`, upsert: false });
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }
    // Remove arquivo antigo, se houver
    const antigo = form.audio_path;
    const { error: updErr } = await supabase
      .from("config_notificacao_som" as any)
      .update({ audio_path: path })
      .eq("id", form.id);
    if (updErr) {
      setUploading(false);
      toast.error(updErr.message);
      return;
    }
    if (antigo) {
      await supabase.storage.from(SOM_BUCKET).remove([antigo]);
    }
    setUploading(false);
    toast.success("Áudio enviado");
    qc.invalidateQueries({ queryKey: ["config-notificacao-som"] });
  };

  const handleRemoverAudio = async () => {
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
    qc.invalidateQueries({ queryKey: ["config-notificacao-som"] });
  };

  return (
    <AdminShell title="Som de alerta">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl tracking-wide flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Notificação sonora do entregador
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Esse som toca no app do entregador quando um novo pedido aparece. Use o
            botão "Testar" para ouvir antes de salvar.
          </p>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <form
            onSubmit={handleSave}
            className="bg-card border border-border rounded-lg p-6 space-y-5 shadow-card"
          >
            <label className="flex items-center justify-between gap-3 p-3 bg-muted/40 border border-border rounded-md cursor-pointer">
              <div>
                <div className="font-bold text-sm">Som ativado</div>
                <div className="text-xs text-muted-foreground">
                  Quando desligado, o entregador só recebe vibração (se ativada).
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                className="h-5 w-5 accent-primary"
              />
            </label>

            <label className="flex items-center justify-between gap-3 p-3 bg-muted/40 border border-border rounded-md cursor-pointer">
              <div>
                <div className="font-bold text-sm">Vibrar celular</div>
                <div className="text-xs text-muted-foreground">
                  Vibração curta junto com o som (quando suportado pelo aparelho).
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.vibrar}
                onChange={(e) => setForm({ ...form, vibrar: e.target.checked })}
                className="h-5 w-5 accent-primary"
              />
            </label>

            <div className="p-4 bg-primary/5 border-2 border-dashed border-primary/40 rounded-md space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Music className="h-4 w-4 text-primary" />
                Arquivo de som personalizado
              </div>
              <p className="text-xs text-muted-foreground">
                Envie um MP3 até 2 MB. O volume configurado abaixo continua valendo.
              </p>
              {form.audio_path ? (
                <div className="flex items-center justify-between gap-2 p-3 bg-card border border-border rounded-md">
                  <div className="text-xs font-mono truncate flex-1">
                    {form.audio_path.split("/").pop()}
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoverAudio}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold uppercase tracking-wider rounded-md hover:bg-red-700 transition flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remover
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 px-4 py-3 bg-card border-2 border-dashed border-border rounded-md cursor-pointer hover:border-primary transition">
                  <Upload className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">
                    {uploading ? "Enviando…" : "Escolher arquivo de áudio"}
                  </span>
                  <input
                    type="file"
                    accept="audio/mpeg,audio/mp3,.mp3"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>



            <Field
              icon={<Volume2 className="h-4 w-4 text-primary" />}
              label={`Volume (${(form.volume * 100).toFixed(0)}%)`}
              hint="0 = mudo, 1 = volume máximo"
            >
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={form.volume}
                onChange={(e) => setForm({ ...form, volume: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </Field>


            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={testar}
                className="flex-1 px-4 py-2.5 bg-secondary text-secondary-foreground font-bold rounded-md hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                <Play className="h-4 w-4" />
                Testar som
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-md hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        )}

        <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md p-3">
          A nova configuração passa a valer assim que o entregador recarregar a tela
          de pedidos disponíveis.
        </div>
      </div>
    </AdminShell>
  );
}

function Field({
  icon,
  label,
  hint,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-bold">
        {icon}
        {label}
      </label>
      {children}
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
