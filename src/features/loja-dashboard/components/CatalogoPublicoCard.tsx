import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

export function CatalogoPublicoCard({ catalogoSlug }: { catalogoSlug: string }) {
  const path = `/c/${catalogoSlug}`;
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);
  const fullUrl = origin ? `${origin}${path}` : path;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div className="pp-card rounded-2xl p-5 md:p-6 relative overflow-hidden">
      <div
        className="absolute -bottom-16 -right-16 h-44 w-44 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(0.78 0.16 75 / 0.10), transparent 70%)",
        }}
      />
      <div className="flex items-start gap-4 relative">
        <div className="pp-disc">
          <AlertCircle className="h-[18px] w-[18px]" />
        </div>
        <div className="text-sm flex-1 min-w-0">
          <div className="pp-eyebrow mb-1">Seu cardápio público</div>
          <p className="text-white/65 leading-relaxed mb-2">
            Compartilhe este link com seus clientes:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-0 px-3 py-2 bg-white/[0.05] border border-white/10 rounded text-[var(--rota-gold)] font-mono text-[12px] break-all hover:bg-white/[0.08] transition"
              title="Abrir cardápio em nova aba"
            >
              {fullUrl}
            </a>
            <button
              type="button"
              onClick={copiar}
              className="shrink-0 px-3 py-2 rounded bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] text-white text-[11px] font-bold uppercase tracking-wider transition"
            >
              Copiar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
