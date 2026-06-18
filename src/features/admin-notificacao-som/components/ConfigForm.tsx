import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Play, Save, Volume2 } from "lucide-react";
import {
  DEFAULT_SOM,
  desbloquearAudio,
  precarregarSom,
  tocarNotificacao,
  type ConfigNotificacaoSom,
} from "@/lib/notificacao-som";
import { useNotificacaoSom } from "../hooks/use-notificacao-som";
import { Field, ToggleCard } from "./Field";
import { AudioUpload } from "./AudioUpload";

import type { SomScope } from "@/lib/notificacao-som";

export function ConfigForm({ scope = "entregador" }: { scope?: SomScope }) {
  const { data, isLoading, salvar, uploadAudio, removerAudio } = useNotificacaoSom(scope);
  const [form, setForm] = useState<ConfigNotificacaoSom>(DEFAULT_SOM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm({ ...DEFAULT_SOM, ...data });
  }, [data]);

  useEffect(() => {
    if (form.audio_path) precarregarSom({ ...form, ativo: true });
  }, [form.audio_path]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await salvar(form);
    setSaving(false);
  };

  const testar = async () => {
    if (!form.audio_path) {
      toast.error("Envie um MP3 primeiro para testar");
      return;
    }
    desbloquearAudio();
    await precarregarSom({ ...form, ativo: true });
    tocarNotificacao({ ...form, ativo: true });
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  return (
    <form onSubmit={handleSave} className="bg-card border border-border rounded-lg p-6 space-y-5 shadow-card">
      <ToggleCard
        title="Som ativado"
        description="Quando desligado, o entregador só recebe vibração (se ativada)."
        checked={form.ativo}
        onChange={(v) => setForm({ ...form, ativo: v })}
      />
      <ToggleCard
        title="Vibrar celular"
        description="Vibração curta junto com o som (quando suportado pelo aparelho)."
        checked={form.vibrar}
        onChange={(v) => setForm({ ...form, vibrar: v })}
      />

      <AudioUpload
        audioPath={form.audio_path}
        onUpload={(file) => uploadAudio(form, file)}
        onRemove={() => removerAudio(form)}
      />

      <Field
        icon={<Volume2 className="h-4 w-4 text-primary" />}
        label={`Volume (${(form.volume * 100).toFixed(0)}%)`}
        hint="0 = mudo, 1 = volume máximo"
      >
        <input
          type="range" min="0" max="1" step="0.05"
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
  );
}
