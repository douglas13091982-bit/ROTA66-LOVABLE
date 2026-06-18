import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const STORAGE_KEY = "entregador:hide-ganho-dia";

export function GanhoHojeCard({ valor }: { valor: number }) {
  const [hide, setHide] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, hide ? "1" : "0");
    } catch {}
  }, [hide]);

  return (
    <div className="mb-5 px-1">
      <div className="pp-eyebrow mb-2 text-[10px] text-center">Ganhos do dia</div>
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <div
            className="text-4xl font-bold tracking-tight leading-none text-white text-center"
            style={{ textShadow: "0 4px 24px oklch(0.78 0.16 75 / 0.25)" }}
          >
            {hide ? "R$ ••••" : `R$ ${valor.toFixed(2)}`}
          </div>
          <button
            onClick={() => setHide((v) => !v)}
            className="inline-flex items-center justify-center h-10 w-10 rounded-full text-white/45 hover:text-white transition-all duration-300"
            aria-label={hide ? "Mostrar valor" : "Ocultar valor"}
          >
            {hide ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
          </button>
        </div>
      </div>
    </div>
  );
}
