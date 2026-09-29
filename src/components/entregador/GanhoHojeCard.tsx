import { useEffect, useState } from "react";
import { Wallet, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { formatCurrencyValue } from "@/lib/format";

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
    <Link 
      to="/entregador/carteira"
      data-ganho-hoje 
      className="inline-flex items-center gap-3 bg-[#0d2c54] rounded-2xl pl-3 pr-4 py-2.5 shadow-lg shadow-[#0d2c54]/15 border border-white/10 active:scale-95 transition-transform"
    >
      <div className="h-9 w-9 rounded-xl bg-white/10 grid place-items-center"><Wallet className="h-4 w-4 text-white" strokeWidth={2.5} /></div>
      <div className="flex flex-col -gap-1">
        <span className="text-[8px] font-bold uppercase tracking-[0.12em] leading-none text-white/60" style={{ color: "#ffffff" }}>Saldo disponível</span>
        <div className="text-[17px] font-black tracking-tighter tabular-nums leading-none" style={{ color: "#ffffff" }}>
          {hide ? "R$ ••••" : `R$ ${formatCurrencyValue(valor)}`}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 ml-1" style={{ color: "#ffffff" }} />

    </Link>
  );
}
