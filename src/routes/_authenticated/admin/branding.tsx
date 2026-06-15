import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Image as ImageIcon, Save, Upload } from "lucide-react";
import { writeBrandingCache } from "@/hooks/use-branding";

export const Route = createFileRoute("/_authenticated/admin/branding")({
  component: AdminBranding,
});

const MAX_BYTES = 500_000; // 500KB

function AdminBranding() {
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
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("config_branding")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
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
    if (file.size > MAX_BYTES) {
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
    const updatedBranding = savedBranding;
    writeBrandingCache(updatedBranding);
    qc.setQueryData(["config-branding"], updatedBranding);
    qc.setQueryData(["config-branding-admin"], updatedBranding);
    setDirty(false);
    toast.success("Identidade salva");
    qc.invalidateQueries({ queryKey: ["config-branding-admin"] });
    qc.invalidateQueries({ queryKey: ["config-branding"], refetchType: "all" });
  };

  return (
    <AdminShell title="Identidade">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl tracking-wide flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" />
            Logo e nome do sistema
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            A logo é exibida em todos os painéis (admin, loja, entregador).
          </p>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <div className="bg-card border border-border rounded-lg p-6 space-y-5 shadow-card">
            <div className="space-y-2">
              <label className="text-sm font-bold">Logo atual</label>
              <div className="bg-background border border-border rounded-md p-6 flex items-center justify-center">
                {logo ? (
                  <img src={logo} alt="Logo" className="max-h-32 w-auto" />
                ) : (
                  <div className="text-sm text-muted-foreground">Sem logo enviada</div>
                )}
              </div>
              <label className="flex items-center gap-2 px-4 py-2 bg-muted text-sm font-bold rounded-md cursor-pointer hover:bg-muted/70 w-fit">
                <Upload className="h-4 w-4" />
                Enviar nova
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </label>
              <p className="text-xs text-muted-foreground">PNG/SVG/WebP — máx 500KB.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold">Nome do sistema</label>
              <input
                value={nome}
                onChange={(e) => {
                  setNome(e.target.value);
                  setDirty(true);
                }}
                maxLength={60}
                className="w-full px-3 py-2 bg-background border border-border rounded-md"
              />
            </div>

            <div className="pt-4 border-t border-border space-y-4">
              <div>
                <div className="text-sm font-bold">Suporte do Entregador</div>
                <p className="text-xs text-muted-foreground">
                  Exibido na Central de Ajuda do app do entregador.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">WhatsApp de suporte</label>
                <input
                  value={suporteWhatsapp}
                  onChange={(e) => {
                    setSuporteWhatsapp(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Ex: 5547999999999 (com DDI e DDD, somente números)"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md"
                />
                <p className="text-[11px] text-muted-foreground">
                  Use o formato internacional sem símbolos. Ex: 5547999999999.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">Horário de atendimento</label>
                <input
                  value={suporteHorario}
                  onChange={(e) => {
                    setSuporteHorario(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Ex: Segunda a sábado, 8h às 20h"
                  maxLength={120}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-md hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
