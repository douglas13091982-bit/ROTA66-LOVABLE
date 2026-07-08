import { useEffect, useState } from "react";
import { Eye, EyeOff, Wallet } from "lucide-react";

const STORAGE_KEY = "entregador:hide-ganho-dia";
const META_DIA = 150;

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

  const pct = Math.max(0, Math.min(100, (valor / META_DIA) * 100));

  return (
    <div
      className="relative mb-4 overflow-hidden rounded-2xl p-5"
      style={{
        background: "#0F2341",
        boxShadow:
          "0 1px 2px rgba(15,35,65,0.10), 0 18px 40px -22px rgba(15,35,65,0.45)",
      }}
    >
      {/* Wallet decorativa */}
      <Wallet
        className="absolute right-4 bottom-4 opacity-10 text-white"
        style={{ width: 88, height: 88 }}
        strokeWidth={1.4}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[13px] font-medium text-white/80">
            Ganhos do dia
          </div>
          <div className="mt-2 text-[36px] font-extrabold leading-none tracking-tight text-white">
            {hide ? "R$ ••••" : `R$ ${valor.toFixed(2).replace(".", ",")}`}
          </div>
        </div>
        <button
          onClick={() => setHide((v) => !v)}
          className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-white/10 text-white/90 hover:bg-white/15 transition"
          aria-label={hide ? "Mostrar valor" : "Ocultar valor"}
        >
          {hide ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <div className="relative mt-5">
        <div className="h-px w-full bg-white/15" />
        <div className="mt-3 flex items-center justify-between text-[12px] text-white/75">
          <span>
            Meta do dia:{" "}
            <span className="font-bold text-[#D8232A]">
              R$ {META_DIA.toFixed(2).replace(".", ",")}
            </span>
          </span>
          <span className="font-semibold text-white/90">{Math.round(pct)}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              minWidth: pct > 0 ? 8 : 0,
              background: "#D8232A",
              boxShadow: "0 0 12px rgba(216,35,42,0.6)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
