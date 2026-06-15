import { Plus, Save, Upload } from "lucide-react";

type Props = {
  titulo: string;
  linkUrl: string;
  imageDataUrl: string | null;
  saving: boolean;
  onTituloChange: (v: string) => void;
  onLinkChange: (v: string) => void;
  onFile: (f: File) => void;
  onCreate: () => void;
};

export function NovoAnuncioForm({
  titulo,
  linkUrl,
  imageDataUrl,
  saving,
  onTituloChange,
  onLinkChange,
  onFile,
  onCreate,
}: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4 shadow-card">
      <div className="font-bold flex items-center gap-2">
        <Plus className="h-4 w-4" /> Novo anúncio
      </div>

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
              if (f) onFile(f);
            }}
          />
        </label>
        <p className="text-xs text-muted-foreground">PNG/JPG/WebP — máx 800KB.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold">Título (opcional)</label>
        <input
          value={titulo}
          onChange={(e) => onTituloChange(e.target.value)}
          maxLength={80}
          className="w-full px-3 py-2 bg-background border border-border rounded-md"
          placeholder="Ex: Bônus de fim de semana"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold">Link ao clicar (opcional)</label>
        <input
          value={linkUrl}
          onChange={(e) => onLinkChange(e.target.value)}
          maxLength={500}
          className="w-full px-3 py-2 bg-background border border-border rounded-md"
          placeholder="https://..."
        />
      </div>

      <button
        onClick={onCreate}
        disabled={saving || !imageDataUrl}
        className="w-full px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-md hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Save className="h-4 w-4" />
        {saving ? "Salvando…" : "Publicar anúncio"}
      </button>
    </div>
  );
}
