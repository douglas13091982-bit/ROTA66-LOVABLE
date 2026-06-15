import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { writeBrandingCache } from "@/hooks/use-branding";
import { BRANDING_MAX_BYTES, type BrandingRow } from "../logic/types";

export function useBrandingForm() {
  const qc = useQueryClient();
  const [logo, setLogo] = useState<string | null>(null);
  const [nome, setNome] = useState("ROTA 66");
  const [suporteWhatsapp, setSuporteWhatsapp] = useState("");
  const [suporteHorario, setSuporteHorario] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["config-branding-admin"],
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<BrandingRow | null> => {
      const { data, error } = await (supabase as any)
        .from("config_branding")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as BrandingRow | null;
    },
  });

  useEffect(() => {
    if (data && !dirty) {
      setLogo(data.logo_data_url ?? null);
      setNome(data.nome_sistema ?? "ROTA 66");
      setSuporteWhatsapp(data.suporte_whatsapp ?? "");
      setSuporteHorario(data.suporte_horario ?? "");
    }
  }, [data, dirty]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    if (file.size > BRANDING_MAX_BYTES) {
      toast.error("Imagem muito grande (máx 500KB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result as string);
      setDirty(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!data?.id) {
      toast.error("Config não carregou");
      return;
    }
    if (!nome.trim()) {
      toast.error("Nome obrigatório");
      return;
    }
    setSaving(true);
    const { data: savedBranding, error } = await (supabase as any)
      .from("config_branding")
      .update({
        logo_data_url: logo,
        nome_sistema: nome.trim(),
        suporte_whatsapp: suporteWhatsapp.trim() || null,
        suporte_horario: suporteHorario.trim() || null,
      })
      .eq("id", data.id)
      .select("*")
      .maybeSingle();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!savedBranding) {
      toast.error("Não foi possível confirmar a gravação da identidade.");
      return;
    }
    writeBrandingCache(savedBranding);
    qc.setQueryData(["config-branding"], savedBranding);
    qc.setQueryData(["config-branding-admin"], savedBranding);
    setDirty(false);
    toast.success("Identidade salva");
    qc.invalidateQueries({ queryKey: ["config-branding-admin"] });
    qc.invalidateQueries({ queryKey: ["config-branding"], refetchType: "all" });
  };

  const bindText = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setDirty(true);
  };

  return {
    isLoading,
    saving,
    logo,
    nome,
    suporteWhatsapp,
    suporteHorario,
    onNomeChange: bindText(setNome),
    onWhatsappChange: bindText(setSuporteWhatsapp),
    onHorarioChange: bindText(setSuporteHorario),
    handleFile,
    handleSave,
  };
}
