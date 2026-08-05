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
    <div className="inline-flex items-center gap-2 bg-[#0d2c54] rounded-full px-4 py-2 shadow-lg">
      <div className="text-[14px] font-black tracking-tight text-white tabular-nums">
        {hide ? "R$ ••••" : `R$ ${valor.toFixed(2).replace(".", ",")}`}
      </div>
      <button
        onClick={() => setHide((v) => !v)}
        className="inline-flex items-center justify-center h-6 w-6 rounded-full transition hover:bg-white/10"
        style={{ color: "#9ca3af" }}
        aria-label={hide ? "Mostrar valor" : "Ocultar valor"}
      >
        {hide ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
