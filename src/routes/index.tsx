import { createFileRoute, Link } from "@tanstack/react-router";
import homeBgAsset from "@/assets/home-bg.png.asset.json";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Store, Bike, LogIn } from "lucide-react";

export const Route = createFileRoute("/")({
  component: () => (
    <div 
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center bg-no-repeat p-4 relative overflow-hidden"
      style={{ backgroundImage: `url(${homeBgAsset.url})` }}
    >
      {/* Overlay to darken background */}
      <div className="absolute inset-0 bg-navy/60 z-0" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-12 text-center">
        {/* Logo */}
        <div className="w-40 h-40 flex items-center justify-center animate-in fade-in zoom-in duration-700">
          <img 
            src="https://storage.googleapis.com/gpt-engineer-file-uploads/85H1Xj7XI9dnBTV14pAbFErSOmW2/social-images/social-1782498933692-ICONE_APK.webp" 
            alt="ROTA 66" 
            className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(227,0,15,0.5)]"
          />
        </div>

        {/* Title and subtitle */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white tracking-[0.2em] uppercase font-bebas">
            ACELERA
          </h1>
          <div className="flex items-center justify-center gap-4">
            <div className="h-[1px] w-12 bg-white/30" />
            <p className="text-sm font-medium text-white/80 tracking-widest uppercase">
              SEU NOVO DELIVERY
            </p>
            <div className="h-[1px] w-12 bg-white/30" />
          </div>
          <div className="flex justify-center">
            <div className="w-2 h-2 rounded-full bg-red rotate-45" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-4">
          <Link to="/clientes">
            <Button 
              className="w-full h-14 bg-red hover:bg-red/90 text-white rounded-none uppercase tracking-widest font-bold text-sm flex items-center justify-center gap-2 group transition-all duration-300"
            >
              <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
              PEÇA AGORA
            </Button>
          </Link>

          <Link to="/cadastro/loja">
            <Button 
              variant="outline"
              className="w-full h-14 bg-navy/40 hover:bg-navy/60 text-white border-white/20 hover:border-white/40 rounded-none uppercase tracking-widest font-bold text-sm flex items-center justify-center gap-2 group transition-all duration-300"
            >
              <Store className="w-5 h-5 group-hover:scale-110 transition-transform" />
              CADASTRAR MINHA LOJA
            </Button>
          </Link>

          <Link to="/cadastro/entregador">
            <Button 
              variant="outline"
              className="w-full h-14 bg-navy/40 hover:bg-navy/60 text-white border-white/20 hover:border-white/40 rounded-none uppercase tracking-widest font-bold text-sm flex items-center justify-center gap-2 group transition-all duration-300"
            >
              <Bike className="w-5 h-5 group-hover:scale-110 transition-transform" />
              SOU ENTREGADOR
            </Button>
          </Link>
        </div>

        {/* Login Footer */}
        <div className="mt-8 flex items-center gap-2 text-white/70 text-sm tracking-wide">
          <span>Já tem conta?</span>
          <Link to="/auth" className="text-white font-bold hover:text-red transition-colors flex items-center gap-1 border-b border-white/40 uppercase">
            ENTRAR
          </Link>
        </div>
      </div>
    </div>
  ),
  head: () => ({
    meta: [
      { title: "ROTA 66 - Seu Novo Delivery" },
      { name: "description", content: "Peça agora, cadastre sua loja ou seja um entregador na ROTA 66." }
    ]
  })
});