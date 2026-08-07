import { useEffect, useState } from "react";
import { Wallet, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

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
      className="inline-flex items-center gap-3 bg-[#0d2c54] rounded-full pl-4 pr-5 py-2.5 shadow-xl shadow-[#0d2c54]/20 active:scale-95 transition-transform"
    >
      <Wallet className="h-5 w-5 text-white" strokeWidth={2.5} />
      <div className="flex flex-col -gap-1">
        <span className="text-[9px] font-bold text-white uppercase tracking-widest leading-none">Saldo disponível</span>
        <div className="text-[17px] font-black tracking-tighter tabular-nums leading-none text-white">
          {hide ? "R$ ••••" : `R$ ${valor.toFixed(2).replace(".", ",")}`}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-white/40 ml-1" />
    </Link>
  );
}
