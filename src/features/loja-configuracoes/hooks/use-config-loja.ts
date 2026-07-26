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
      catalogo_status_inicial:
        loja.catalogo_status_inicial === "pronto" ? "pronto" : "em_preparo",
      categoria: (loja.categoria ?? "") as LojaCategoria | "",
      usar_horario_automatico: !!loja.usar_horario_automatico,
      city_id: loja.city_id ?? "",
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
    // Limite generoso no arquivo original (10MB) — a conversão para WebP
    // reduz drasticamente o peso antes de salvar.
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 10MB)");
      return;
    }
    try {
      // Logo aparece pequena — 512px já é suficiente e garante que o
      // data URL final caiba bem abaixo do limite antigo de 500KB.
      let dataUrl = await convertImageToWebpDataUrl(file, {
        maxDimension: 512,
        quality: 0.85,
      });
      // Segurança extra: se ainda estourar, recomprime mais agressivo.
      if (dataUrl.length > LOGO_MAX_BYTES * 1.4) {
        dataUrl = await convertImageToWebpDataUrl(file, {
          maxDimension: 384,
          quality: 0.72,
        });
      }
      setLogoUrl(dataUrl);
    } catch {
      toast.error("Falha ao processar imagem");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!loja) return;
    if (!form.city_id) {
      toast.error("Selecione a cidade da loja");
      return;
    }
    setSaving(true);
    // Busca nome/uf da cidade para manter os campos texto sincronizados.
    const { data: cidadeRow } = await (supabase as any)
      .from("cidades")
      .select("nome, uf")
      .eq("id", form.city_id)
      .maybeSingle();
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
        catalogo_status_inicial: form.catalogo_status_inicial,
        categoria: form.categoria || null,
        usar_horario_automatico: true,
        horario_funcionamento: horario,
        city_id: form.city_id,
        cidade: cidadeRow?.nome ?? undefined,
        estado: cidadeRow?.uf ?? undefined,
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
