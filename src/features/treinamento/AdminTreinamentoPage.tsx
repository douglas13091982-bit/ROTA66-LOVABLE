import { useState } from "react";
import { Pencil, Trash2, Plus, GraduationCap, ExternalLink } from "lucide-react";
import {
  useTreinamentoVideos,
  useSalvarTreinamentoVideo,
  useExcluirTreinamentoVideo,
  type TreinamentoVideo,
} from "./hooks/use-treinamento-videos";
import { getYoutubeEmbed, getYoutubeId, getYoutubeThumb } from "@/lib/youtube";

type FormState = {
  id?: string;
  titulo: string;
  descricao: string;
  youtube_url: string;
  ordem: number;
  ativo: boolean;
  onboarding_entregador: boolean;
};

const EMPTY: FormState = { titulo: "", descricao: "", youtube_url: "", ordem: 0, ativo: true, onboarding_entregador: false };

export function AdminTreinamentoPage() {
  const { data: videos, isLoading } = useTreinamentoVideos({ includeInactive: true });
  const salvar = useSalvarTreinamentoVideo();
  const excluir = useExcluirTreinamentoVideo();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);

  const editar = (v: TreinamentoVideo) => {
    setEditing(v.id);
    setForm({
      id: v.id,
      titulo: v.titulo,
      descricao: v.descricao ?? "",
      youtube_url: v.youtube_url,
      ordem: v.ordem,
      ativo: v.ativo,
      onboarding_entregador: v.onboarding_entregador ?? false,
    });
  };

  const cancelar = () => {
    setEditing(null);
    setForm(EMPTY);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.youtube_url.trim()) return;
    if (!getYoutubeId(form.youtube_url)) {
      alert("URL do YouTube inválida");
      return;
    }
    await salvar.mutateAsync({
      id: form.id,
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      youtube_url: form.youtube_url.trim(),
      ordem: Number(form.ordem) || 0,
      ativo: form.ativo,
      onboarding_entregador: form.onboarding_entregador,
    });
    cancelar();
  };

  const remover = async (id: string) => {
    if (!confirm("Excluir este vídeo de treinamento?")) return;
    await excluir.mutateAsync(id);
    if (editing === id) cancelar();
  };

  const previewEmbed = getYoutubeEmbed(form.youtube_url);

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/10 grid place-items-center">
          <GraduationCap className="h-5 w-5 text-white/80" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Vídeos de treinamento</h1>
          <p className="text-[12px] text-white/50">Cadastre URLs de vídeos do YouTube exibidos para as lojas</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário */}
        <form onSubmit={submit} className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-white font-semibold">
              {editing ? "Editar vídeo" : "Novo vídeo"}
            </div>
            {editing && (
              <button type="button" onClick={cancelar} className="text-[12px] text-white/60 hover:text-white">
                cancelar
              </button>
            )}
          </div>

          <label className="block space-y-1">
            <span className="text-[12px] text-white/60">Título</span>
            <input
              required
              value={form.titulo}
              onChange={(e) => setForm((s) => ({ ...s, titulo: e.target.value }))}
              className="w-full h-10 px-3 rounded-md bg-white/[0.03] border border-white/10 text-white text-sm outline-none focus:border-white/30"
              placeholder="Ex: Como cadastrar produtos"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[12px] text-white/60">URL do YouTube</span>
            <input
              required
              value={form.youtube_url}
              onChange={(e) => setForm((s) => ({ ...s, youtube_url: e.target.value }))}
              className="w-full h-10 px-3 rounded-md bg-white/[0.03] border border-white/10 text-white text-sm outline-none focus:border-white/30"
              placeholder="https://youtube.com/watch?v=..."
            />
            {form.youtube_url && !getYoutubeId(form.youtube_url) && (
              <span className="text-[11px] text-red-400">URL inválida</span>
            )}
          </label>

          <label className="block space-y-1">
            <span className="text-[12px] text-white/60">Descrição (opcional)</span>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm((s) => ({ ...s, descricao: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-md bg-white/[0.03] border border-white/10 text-white text-sm outline-none focus:border-white/30 resize-y"
              placeholder="Breve resumo do conteúdo"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-[12px] text-white/60">Ordem</span>
              <input
                type="number"
                value={form.ordem}
                onChange={(e) => setForm((s) => ({ ...s, ordem: Number(e.target.value) }))}
                className="w-full h-10 px-3 rounded-md bg-white/[0.03] border border-white/10 text-white text-sm outline-none focus:border-white/30"
              />
            </label>
            <label className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm((s) => ({ ...s, ativo: e.target.checked }))}
                className="h-4 w-4"
              />
              <span className="text-[13px] text-white/70">Ativo (visível para lojas)</span>
            </label>
          </div>

          {previewEmbed && (
            <div className="aspect-video w-full rounded-md overflow-hidden border border-white/10 bg-black">
              <iframe src={previewEmbed} className="w-full h-full" allowFullScreen title="preview" />
            </div>
          )}

          <button
            type="submit"
            disabled={salvar.isPending}
            className="w-full h-10 rounded-md bg-gradient-red text-white font-semibold text-sm shadow-red disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {editing ? "Salvar alterações" : "Adicionar vídeo"}
          </button>
        </form>

        {/* Lista */}
        <div className="space-y-3">
          <div className="pp-eyebrow px-1">Cadastrados ({videos?.length ?? 0})</div>
          {isLoading ? (
            <div className="text-white/50 text-sm">Carregando...</div>
          ) : !videos || videos.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-white/50 text-sm">
              Nenhum vídeo cadastrado ainda.
            </div>
          ) : (
            videos.map((v) => {
              const thumb = getYoutubeThumb(v.youtube_url);
              return (
                <div
                  key={v.id}
                  className="flex gap-3 p-3 rounded-lg border border-white/10 bg-white/[0.02]"
                >
                  <div className="shrink-0 w-28 aspect-video rounded-md overflow-hidden bg-black">
                    {thumb && <img src={thumb} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-[13px] font-semibold text-white truncate">{v.titulo}</div>
                      {!v.ativo && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 uppercase">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-white/40 truncate">
                      Ordem: {v.ordem} ·{" "}
                      <a
                        href={v.youtube_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:text-white/70"
                      >
                        abrir <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    {v.descricao && (
                      <div className="text-[12px] text-white/60 line-clamp-2 mt-1">{v.descricao}</div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => editar(v)}
                        className="text-[11px] px-2 py-1 rounded border border-white/10 hover:bg-white/5 text-white/80 inline-flex items-center gap-1"
                      >
                        <Pencil className="h-3 w-3" /> Editar
                      </button>
                      <button
                        onClick={() => remover(v.id)}
                        className="text-[11px] px-2 py-1 rounded border border-red-500/30 hover:bg-red-500/10 text-red-300 inline-flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" /> Excluir
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
