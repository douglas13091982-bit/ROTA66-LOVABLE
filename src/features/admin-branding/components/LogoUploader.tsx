import { Upload } from "lucide-react";

type Props = {
  logo: string | null;
  onFile: (file: File) => void;
};

export function LogoUploader({ logo, onFile }: Props) {
  return (
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
            if (f) onFile(f);
          }}
        />
      </label>
      <p className="text-xs text-muted-foreground">PNG/SVG/WebP — máx 500KB.</p>
    </div>
  );
}
