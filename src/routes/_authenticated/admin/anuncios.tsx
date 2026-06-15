import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Upload, Trash2, Plus, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/anuncios")({
  component: AdminAnuncios,
});

const MAX_BYTES = 800_000;

function AdminAnuncios() {
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: anuncios, isLoading } = useQuery({
    queryKey: ["anuncios-entregador-admin"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("anuncios_entregador")
        .select("*")
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Selecione uma imagem");
    if (file.size > MAX_BYTES) return toast.error("Imagem muito grande (máx 800KB)");
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!imageDataUrl) return toast.error("Envie uma imagem");
    setSaving(true);
    const { error } = await (supabase as any).from("anuncios_entregador").insert({
      titulo: titulo.trim() || null,
      link_url: linkUrl.trim() || null,
      image_data_url: imageDataUrl,
      ativo: true,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Anúncio criado");
    setTitulo("");
    setLinkUrl("");
    setImageDataUrl(null);
    qc.invalidateQueries({ queryKey: ["anuncios-entregador-admin"] });
    qc.invalidateQueries({ queryKey: ["anuncios-entregador"] });
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    const { error } = await (supabase as any)
      .from("anuncios_entregador")
      .update({ ativo: !ativo })
      .eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["anuncios-entregador-admin"] });
    qc.invalidateQueries({ queryKey: ["anuncios-entregador"] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este anúncio?")) return;
    const { error } = await (supabase as any)
      .from("anuncios_entregador")
      .delete()
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Anúncio excluído");
    qc.invalidateQueries({ queryKey: ["anuncios-entregador-admin"] });
    qc.invalidateQueries({ queryKey: ["anuncios-entregador"] });
  };

  return (
    <AdminShell title="Anúncios">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl tracking-wide flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Avisos para entregadores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Banners exibidos na parte inferior da página de pedidos disponíveis.
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4 shadow-card">
          <div className="font-bold flex items-center gap-2"><Plus className="h-4 w-4" /> Novo anúncio</div>

          <div className="space-y-2">
            <label className="text-sm font-bold">Imagem do banner</label>
            <div className="bg-background border border-border rounded-md p-4 flex items-center justify-center min-h-32">
              {imageDataUrl ? (
                <img src={imageDataUrl} alt="Preview" className="max-h-48 w-auto rounded" />
              ) : (
                <div className="text-sm text-muted-foreground">Nenhuma imagem selecionada</div>
              )}
            </div>
            <label className="flex items-center gap-2 px-4 py-2 bg-muted text-sm font-bold rounded-md cursor-pointer hover:bg-muted/70 w-fit">
              <Upload className="h-4 w-4" />
              Escolher imagem
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
            <p className="text-xs text-muted-foreground">PNG/JPG/WebP — máx 800KB.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">Título (opcional)</label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={80}
              className="w-full px-3 py-2 bg-background border border-border rounded-md"
              placeholder="Ex: Bônus de fim de semana"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">Link ao clicar (opcional)</label>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              maxLength={500}
              className="w-full px-3 py-2 bg-background border border-border rounded-md"
              placeholder="https://..."
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={saving || !imageDataUrl}
            className="w-full px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-md hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando…" : "Publicar anúncio"}
          </button>
        </div>

        <div className="space-y-3">
          <div className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
            Anúncios cadastrados
          </div>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando…</div>
          ) : !anuncios || anuncios.length === 0 ? (
            <div className="text-sm text-muted-foreground bg-card border border-border rounded-md p-6 text-center">
              Nenhum anúncio cadastrado ainda.
            </div>
          ) : (
            anuncios.map((a) => (
              <div key={a.id} className="bg-card border border-border rounded-lg p-4 flex gap-4 items-start">
                <img src={a.image_data_url} alt={a.titulo ?? ""} className="w-32 h-20 object-cover rounded" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{a.titulo || "(sem título)"}</div>
                  {a.link_url && (
                    <div className="text-xs text-muted-foreground truncate">{a.link_url}</div>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => toggleAtivo(a.id, a.ativo)}
                      className={`px-3 py-1 text-xs font-bold rounded-md ${
                        a.ativo
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {a.ativo ? "Ativo" : "Inativo"}
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="px-3 py-1 text-xs font-bold rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminShell>
  );
}
