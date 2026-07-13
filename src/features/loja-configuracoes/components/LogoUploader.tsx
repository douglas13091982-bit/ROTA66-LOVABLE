export function LogoUploader({
  logoUrl,
  onFile,
  onRemove,
}: {
  logoUrl: string | null;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div>
      <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
        Logo da loja (catálogo)
      </span>
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-xl bg-background border border-border flex items-center justify-center overflow-hidden shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] text-muted-foreground text-center px-1">Sem logo</span>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 px-3 py-2 bg-muted text-xs font-bold uppercase tracking-wider rounded-md cursor-pointer hover:bg-muted/70">
              Enviar logo
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            {logoUrl && (
              <button
                type="button"
                onClick={onRemove}
                className="px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-md border border-border text-muted-foreground hover:text-primary"
              >
                Remover
              </button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">PNG, JPG, SVG ou WebP — pode enviar até 10MB, a imagem é otimizada automaticamente.</p>
        </div>
      </div>
    </div>
  );
}
