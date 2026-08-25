import { createFileRoute, Link } from "@tanstack/react-router";
import roadBg from "@/assets/splash-road.webp";
import rota66Logo from "@/assets/rota66-logo.webp";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Store, Bike } from "lucide-react";

export const Route = createFileRoute("/")({
  component: () => (
    <div 
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center bg-no-repeat p-4 relative overflow-hidden"
      style={{ backgroundImage: `url(${roadBg})` }}
    >
      {/* Overlay for depth */}
      <div className="absolute inset-0 bg-navy/70 z-0" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-10 text-center">
        {/* Logo with glow effect */}
        <div className="w-48 h-48 flex items-center justify-center animate-in fade-in zoom-in duration-1000">
          <img 
            src={rota66Logo} 
            alt="ROTA 66" 
            className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(227,0,15,0.6)]"
          />
        </div>

        {/* Subtitle - Replaced ACELERA with SEU NOVO DELIVERY per new mockup */}
        <div className="space-y-4">
          <p className="text-[12px] font-bold text-white/80 tracking-[0.4em] uppercase">
            SEU NOVO DELIVERY
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="h-[1px] w-12 bg-white/20" />
            <div className="w-1.5 h-1.5 rounded-full bg-red rotate-45 shadow-[0_0_8px_rgba(227,0,15,0.8)]" />
            <div className="h-[1px] w-12 bg-white/20" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-3 px-2">
          <Link to="/clientes">
            <Button 
              className="w-full h-12 bg-red hover:bg-red/90 text-white rounded-none uppercase tracking-[0.2em] font-bold text-xs flex items-center justify-center gap-2 group transition-all duration-300 shadow-lg"
            >
              <ShoppingBag className="w-4 h-4 group-hover:scale-110 transition-transform" />
              PEÇA AGORA
            </Button>
          </Link>

          <Link to="/cadastro" search={{ role: 'loja_admin' }}>
            <Button 
              variant="outline"
              className="w-full h-12 bg-navy/40 hover:bg-navy/60 text-white border-white/10 hover:border-white/20 rounded-none uppercase tracking-[0.2em] font-bold text-xs flex items-center justify-center gap-2 group transition-all duration-300"
            >
              <Store className="w-4 h-4 group-hover:scale-110 transition-transform" />
              CADASTRAR MINHA LOJA
            </Button>
          </Link>

          <Link to="/cadastro" search={{ role: 'entregador' }}>
            <Button 
              variant="outline"
              className="w-full h-12 bg-navy/40 hover:bg-navy/60 text-white border-white/10 hover:border-white/20 rounded-none uppercase tracking-[0.2em] font-bold text-xs flex items-center justify-center gap-2 group transition-all duration-300"
            >
              <Bike className="w-4 h-4 group-hover:scale-110 transition-transform" />
              SOU ENTREGADOR
            </Button>
          </Link>
        </div>

        {/* Login Footer */}
        <div className="mt-4 flex items-center gap-2 text-white/50 text-[11px] tracking-wider font-medium">
          <span>JÁ TEM CONTA?</span>
          <Link to="/login" className="text-white font-bold hover:text-red transition-colors border-b border-white/30 hover:border-red/50 pb-0.5">
            ENTRAR
          </Link>
        </div>
      </div>
    </div>
  ),
  head: () => ({
    meta: [
      { title: "ROTA 66 - Seu Novo Delivery" },
      { name: "description", content: "Peça agora, cadastre sua loja ou seja um entregador na ROTA 66." },
      { property: "og:title", content: "ROTA 66 - Seu Novo Delivery" },
      { property: "og:description", content: "Peça agora, cadastre sua loja ou seja um entregador na ROTA 66." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" }
    ]
  })
});
