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
    <div data-ganho-hoje className="inline-flex items-center gap-3 bg-[#0d2c54] rounded-[22px] px-4 py-2 shadow-xl border-2 border-[#0d2c54]">
      <div className="text-[18px] font-black tracking-tighter tabular-nums" style={{ color: "#ffffff" }}>
        {hide ? "R$ ••••" : `R$ ${valor.toFixed(2).replace(".", ",")}`}
      </div>
      <button
        onClick={() => setHide((v) => !v)}
        className="inline-flex items-center justify-center h-8 w-8 rounded-xl transition active:scale-95"
        style={{ background: "#0d2c54", color: "#ffffff" }}
        aria-label={hide ? "Mostrar valor" : "Ocultar valor"}
      >
        {hide ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
