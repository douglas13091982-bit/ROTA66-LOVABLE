import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { convertImageToWebpDataUrl } from "@/lib/image-to-webp";
import {
  ANUNCIO_MAX_BYTES,
  diasParaExpiracao,
  type AnuncioRow,
} from "../logic/types";

export function useAnuncios() {
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [diasValidade, setDiasValidade] = useState<number>(30);
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

  const handleFile = async (file: File) => {
    const nameLower = (file.name || "").toLowerCase();
    const looksImage =
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|heic|heif|gif|bmp|tiff?)$/.test(nameLower);
    if (!looksImage) return toast.error("Selecione uma imagem");
    // Limite alto só para evitar carregar arquivos absurdos no navegador antes da compressão.
    if (file.size > 15 * 1024 * 1024)
      return toast.error("Imagem muito grande (máx 15MB antes da compressão)");
    try {
      // Banner de anúncio: comprime agressivo (máx 1200px, qualidade 0.78).
      let dataUrl = await convertImageToWebpDataUrl(file, {
        maxDimension: 1200,
        quality: 0.78,
      });
      // data URL em base64 ~1.37x o tamanho binário. Se ainda passar do limite,
      // tenta comprimir mais forte antes de desistir.
      if (dataUrl.length > ANUNCIO_MAX_BYTES * 1.4) {
        dataUrl = await convertImageToWebpDataUrl(file, {
          maxDimension: 900,
          quality: 0.7,
        });
      }
      if (dataUrl.length > ANUNCIO_MAX_BYTES * 1.4) {
        return toast.error("Imagem muito pesada mesmo após compressão. Envie uma menor.");
      }
      setImageDataUrl(dataUrl);
    } catch {
      toast.error("Falha ao processar imagem");
    }
  };

  const handleCreate = async () => {
    if (!imageDataUrl) return toast.error("Envie uma imagem");
    setSaving(true);
    const { error } = await (supabase as any).from("anuncios_entregador").insert({
      titulo: titulo.trim() || null,
      link_url: linkUrl.trim() || null,
      image_data_url: imageDataUrl,
      ativo: true,
      expira_em: diasParaExpiracao(diasValidade),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Anúncio criado");
    setTitulo("");
    setLinkUrl("");
    setImageDataUrl(null);
    setDiasValidade(30);
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

  const atualizarPrazo = async (id: string, dias: number | null) => {
    const { error } = await (supabase as any)
      .from("anuncios_entregador")
      .update({ expira_em: diasParaExpiracao(dias) })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(dias ? `Prazo atualizado para ${dias} dias` : "Prazo removido");
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
    diasValidade,
    setDiasValidade,
    saving,
    handleFile,
    handleCreate,
    toggleAtivo,
    atualizarPrazo,
    handleDelete,
  };
}
