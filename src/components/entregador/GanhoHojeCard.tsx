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
    <div data-ganho-hoje className="inline-flex items-center gap-4 bg-[#0d2c54] rounded-[22px] px-6 py-3.5 shadow-2xl border-2 border-[#0d2c54] transition-all hover:scale-[1.02]">
      <div className="text-[22px] font-black tracking-tighter tabular-nums leading-none" style={{ color: "#ffffff" }}>
        {hide ? "R$ ••••" : `R$ ${valor.toFixed(2).replace(".", ",")}`}
      </div>
      <button
        onClick={() => setHide((v) => !v)}
        className="inline-flex items-center justify-center h-10 w-10 rounded-xl transition active:scale-95 hover:bg-white/10"
        style={{ background: "#0d2c54", color: "#ffffff" }}
        aria-label={hide ? "Mostrar valor" : "Ocultar valor"}
      >
        {hide ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}
