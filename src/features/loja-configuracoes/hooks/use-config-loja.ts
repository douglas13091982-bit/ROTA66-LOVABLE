import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  HORARIO_PADRAO,
  lojaAbertaAgora,
  type HorarioFuncionamento,
} from "@/lib/horario-funcionamento";
import type { LojaCategoria } from "@/lib/loja-categorias";
import { convertImageToWebpDataUrl } from "@/lib/image-to-webp";
import { DEFAULT_FORM, LOGO_MAX_BYTES, type ConfigForm } from "../logic/types";

export function useConfigLoja(loja: any | undefined) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ConfigForm>(DEFAULT_FORM);
  const [horario, setHorario] = useState<HorarioFuncionamento>(HORARIO_PADRAO);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loja) return;
    setForm({
      nome: loja.nome ?? "",
      telefone: loja.telefone ?? "",
      endereco: loja.endereco ?? "",
      bairro: loja.bairro ?? "",
      ativa: loja.ativa,
      catalogo_layout: loja.catalogo_layout ?? "cards",
      categoria: (loja.categoria ?? "") as LojaCategoria | "",
      usar_horario_automatico: !!loja.usar_horario_automatico,
    });
    const h = loja.horario_funcionamento;
    setHorario(h && typeof h === "object" && Object.keys(h).length ? h : HORARIO_PADRAO);
    setLogoUrl(loja.logo_url ?? null);
    setCoords({ lat: loja.endereco_lat ?? null, lng: loja.endereco_lng ?? null });
  }, [loja]);

  async function handleLogoFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toast.error("Imagem muito grande (máx 500KB)");
      return;
    }
    try {
      const dataUrl = await convertImageToWebpDataUrl(file);
      setLogoUrl(dataUrl);
    } catch {
      toast.error("Falha ao processar imagem");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!loja) return;
    setSaving(true);
    const { error } = await supabase
      .from("lojas")
      .update({
        nome: form.nome,
        telefone: form.telefone,
        endereco: form.endereco,
        bairro: form.bairro,
        ativa: lojaAbertaAgora(horario),
        endereco_lat: coords.lat,
        endereco_lng: coords.lng,
        logo_url: logoUrl,
        catalogo_layout: form.catalogo_layout,
        categoria: form.categoria || null,
        usar_horario_automatico: true,
        horario_funcionamento: horario,
      } as any)
      .eq("id", loja.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Configurações salvas");
    qc.invalidateQueries({ queryKey: ["minha-loja"] });
  }

  return {
    form,
    setForm,
    horario,
    setHorario,
    logoUrl,
    setLogoUrl,
    coords,
    setCoords,
    saving,
    handleLogoFile,
    handleSave,
  };
}
