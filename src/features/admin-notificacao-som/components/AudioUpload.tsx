import { useState } from "react";
import { Upload, Trash2, Music } from "lucide-react";

export function AudioUpload({
  audioPath,
  onUpload,
  onRemove,
}: {
  audioPath: string | null;
  onUpload: (file: File) => Promise<void> | void;
  onRemove: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 bg-primary/5 border-2 border-dashed border-primary/40 rounded-md space-y-3">
      <div className="flex items-center gap-2 text-sm font-bold">
        <Music className="h-4 w-4 text-primary" />
        Arquivo de som personalizado
      </div>
      <p className="text-xs text-muted-foreground">
        Envie um MP3 até 2 MB. O volume configurado abaixo continua valendo.
      </p>
      {audioPath ? (
        <div className="flex items-center justify-between gap-2 p-3 bg-card border border-border rounded-md">
          <div className="text-xs font-mono truncate flex-1">{audioPath.split("/").pop()}</div>
          <button
            type="button"
            onClick={onRemove}
            className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold uppercase tracking-wider rounded-md hover:bg-red-700 transition flex items-center gap-1.5"
          >
            <Trash2 className="h-3 w-3" />
            Remover
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 px-4 py-3 bg-card border-2 border-dashed border-border rounded-md cursor-pointer hover:border-primary transition">
          <Upload className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold">{uploading ? "Enviando…" : "Escolher arquivo de áudio"}</span>
          <input
            type="file"
            accept="audio/mpeg,audio/mp3,.mp3"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}
