import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { convertImageToWebpDataUrl } from "@/lib/image-to-webp";
import { ANUNCIO_MAX_BYTES, type AnuncioRow } from "../logic/types";

export function useAnuncios() {
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: anuncios, isLoading } = useQuery({
    queryKey: ["anuncios-entregador-admin"],
    queryFn: async (): Promise<AnuncioRow[]> => {
      const { data, error } = await (supabase as any)
        .from("anuncios_entregador")
        .select("*")
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AnuncioRow[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["anuncios-entregador-admin"] });
    qc.invalidateQueries({ queryKey: ["anuncios-entregador"] });
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Selecione uma imagem");
    if (file.size > ANUNCIO_MAX_BYTES) return toast.error("Imagem muito grande (máx 800KB)");
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
    invalidate();
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    const { error } = await (supabase as any)
      .from("anuncios_entregador")
      .update({ ativo: !ativo })
      .eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este anúncio?")) return;
    const { error } = await (supabase as any)
      .from("anuncios_entregador")
      .delete()
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Anúncio excluído");
    invalidate();
  };

  return {
    anuncios,
    isLoading,
    titulo,
    setTitulo,
    linkUrl,
    setLinkUrl,
    imageDataUrl,
    saving,
    handleFile,
    handleCreate,
    toggleAtivo,
    handleDelete,
  };
}
