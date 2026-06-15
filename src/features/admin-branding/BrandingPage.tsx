import { Image as ImageIcon, Save } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { useBrandingForm } from "./hooks/use-branding-form";
import { LogoUploader } from "./components/LogoUploader";
import { TextField } from "./components/TextField";
import { SuporteFields } from "./components/SuporteFields";

export function BrandingPage() {
  const {
    isLoading,
    saving,
    logo,
    nome,
    suporteWhatsapp,
    suporteHorario,
    onNomeChange,
    onWhatsappChange,
    onHorarioChange,
    handleFile,
    handleSave,
  } = useBrandingForm();

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
            <LogoUploader logo={logo} onFile={handleFile} />

            <TextField
              label="Nome do sistema"
              value={nome}
              onChange={onNomeChange}
              maxLength={60}
            />

            <SuporteFields
              whatsapp={suporteWhatsapp}
              horario={suporteHorario}
              onWhatsappChange={onWhatsappChange}
              onHorarioChange={onHorarioChange}
            />

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
