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
    <div className="inline-flex items-center gap-4 bg-[#0d2c54] rounded-2xl px-6 py-4 shadow-xl border-2 border-white/10">
      <div className="text-[24px] font-black tracking-tighter text-white tabular-nums">
        {hide ? "R$ ••••" : `R$ ${valor.toFixed(2).replace(".", ",")}`}
      </div>
      <button
        onClick={() => setHide((v) => !v)}
        className="inline-flex items-center justify-center h-10 w-10 rounded-xl transition hover:bg-white/10"
        style={{ color: "#ffffff" }}
        aria-label={hide ? "Mostrar valor" : "Ocultar valor"}
      >
        {hide ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}
