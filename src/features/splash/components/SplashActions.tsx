import { Link } from "@tanstack/react-router";
import { UtensilsCrossed, Bike, Store } from "lucide-react";

export function SplashActions() {
  return (
    <div className="w-full max-w-sm space-y-3 animate-[fadeUp_1300ms_ease-out_both]">
      <Link
        to="/clientes"
        className="flex items-center justify-center gap-3 w-full text-center bg-[#bb1010]/85 shadow-elevated rounded-none py-4 text-base tracking-[0.16em] text-[#decdb4] hover:bg-[#bb1010] hover:shadow-red hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 ease-premium"
      >
        <UtensilsCrossed className="h-5 w-5" />
        PEDIR COMIDA
      </Link>

      <Link
        to="/cadastro"
        search={{ role: "entregador" }}
        className="flex items-center justify-center gap-3 w-full text-center rounded-none py-3.5 text-sm tracking-[0.18em] text-[#decdb4] border border-white/25 bg-[#003965]/70 hover:bg-[#003965]/95 hover:border-white/50 transition-all duration-300 ease-premium"
      >
        <Bike className="h-4 w-4" />
        SOU ENTREGADOR
      </Link>

      <Link
        to="/cadastro"
        search={{ role: "loja_admin" }}
        className="flex items-center justify-center gap-3 w-full text-center rounded-none py-3.5 text-sm tracking-[0.18em] text-[#decdb4] border border-white/25 bg-[#003965]/70 hover:bg-[#003965]/95 hover:border-white/50 transition-all duration-300 ease-premium"
      >
        <Store className="h-4 w-4" />
        CADASTRAR MINHA LOJA
      </Link>

      <div className="pt-4 text-center text-xs tracking-[0.2em] text-white/60">
        Já tem conta?{" "}
        <Link to="/login" className="text-[#decdb4] hover:text-white underline underline-offset-4">
          ENTRAR
        </Link>
      </div>
    </div>
  );
}
