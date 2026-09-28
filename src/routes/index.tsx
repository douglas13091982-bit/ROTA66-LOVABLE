import { createFileRoute, Link } from "@tanstack/react-router";
import roadBg from "@/assets/splash-road.webp";
import rota66Logo from "@/assets/rota66-logo.webp";
import { Button } from "@/components/ui/button";
import { Bike, LogIn } from "lucide-react";

export const Route = createFileRoute("/")({
  component: () => (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center bg-no-repeat p-4 relative overflow-hidden"
      style={{ backgroundImage: `url(${roadBg})` }}
    >
      <div className="absolute inset-0 bg-navy/75 z-0" />
      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-8 text-center">
        <div className="w-44 h-44 flex items-center justify-center animate-in fade-in zoom-in duration-700">
          <img src={rota66Logo} alt="ROTA 66" className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(227,0,15,0.6)]" />
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold text-white/80 tracking-[0.35em] uppercase">CENTRAL LOGÍSTICA</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">ENTREGADORES E ENTREGAS</h1>
          <p className="text-sm text-white/65 max-w-sm">
            A ROTA 66 cuida da operação logística. Lojas, produtos, clientes e vendas ficam no sistema parceiro.
          </p>
        </div>

        <div className="w-full space-y-3 px-2">
          <Link to="/cadastro" search={{ role: "entregador" }}>
            <Button className="w-full h-13 bg-red hover:bg-red/90 text-white rounded-xl uppercase tracking-[0.14em] font-bold text-sm flex items-center justify-center gap-2 shadow-lg">
              <Bike className="w-5 h-5" />
              CADASTRAR ENTREGADOR
            </Button>
          </Link>

          <Link to="/login">
            <Button variant="outline" className="w-full h-12 bg-navy/40 hover:bg-navy/60 text-white border-white/15 rounded-xl uppercase tracking-[0.14em] font-bold text-xs flex items-center justify-center gap-2">
              <LogIn className="w-4 h-4" />
              ACESSAR PAINEL
            </Button>
          </Link>
        </div>

        <div className="text-[11px] text-white/45">
          ROTA 66 · OPERAÇÃO LOGÍSTICA
        </div>
      </div>
    </div>
  ),
  head: () => ({
    meta: [
      { title: "ROTA 66 — Central Logística" },
      { name: "description", content: "Cadastro e gestão de entregadores da ROTA 66." },
    ],
  }),
});
