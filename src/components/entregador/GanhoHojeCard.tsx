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
    <div className="mb-6 px-1 text-center">
      <div
        className="mb-1 text-[11px] font-bold uppercase tracking-[0.28em]"
        style={{ color: "#374151" }}
      >
        Ganhos do dia
      </div>
      <div className="flex items-center justify-center gap-2">
        <div className="text-[40px] font-extrabold leading-none tracking-tight text-white">
          {hide ? "R$ ••••" : `R$ ${valor.toFixed(2)}`}
        </div>
        <button
          onClick={() => setHide((v) => !v)}
          className="inline-flex items-center justify-center h-9 w-9 rounded-full transition"
          style={{ color: "#9ca3af" }}
          aria-label={hide ? "Mostrar valor" : "Ocultar valor"}
        >
          {hide ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
