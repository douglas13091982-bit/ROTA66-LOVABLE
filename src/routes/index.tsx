import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import roadBg from "@/assets/splash-road.png";
import roadBgDesktop from "@/assets/estrada-desktop.png.asset.json";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ROTA 66 — Entregas sem fronteiras" },
      { name: "description", content: "App do entregador ROTA 66. Acelera, a rota é sua." },
      { property: "og:title", content: "ROTA 66 — App do Entregador" },
      { property: "og:description", content: "Entregas sem fronteiras." },
    ],
  }),
  component: SplashEntregador,
});

function SplashEntregador() {
  const navigate = useNavigate();
  const { user, roles, loading } = useAuth();
  const { logoUrl, nomeSistema } = useBranding();

  // Se já estiver logado, manda direto para o painel apropriado.
  // Só navega quando os papéis já foram carregados — evita mandar
  // todo mundo para /entregador antes de saber o papel real.
  useEffect(() => {
    if (loading || !user || roles.length === 0) return;
    if (roles.includes("super_admin") || roles.includes("admin")) navigate({ to: "/admin" });
    else if (roles.includes("loja_admin")) navigate({ to: "/loja" });
    else if (roles.includes("entregador")) navigate({ to: "/entregador" });
  }, [user, roles, loading, navigate]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a1428] text-foreground flex flex-col">
      {/* Foto da estrada — mobile (retrato) */}
      <img
        src={roadBg}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_bottom] select-none block landscape:hidden sm:hidden"
      />
      {/* Foto da estrada — desktop / telas largas */}
      <img
        src={roadBgDesktop.url}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center select-none hidden landscape:block sm:block"
      />
      {/* Véu superior para fundir o céu com o azul do app e dar contraste ao logo */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0a1428]/90 via-[#0a1428]/55 to-transparent" />
      {/* Véu inferior para reforçar leitura do conteúdo */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0a1428]/85 via-[#0a1428]/35 to-transparent" />

      {/* Conteúdo */}
      <div className="relative z-10 flex flex-1 flex-col items-center px-6 pt-16 pb-10 safe-area">
        {/* Logo */}
        <div className="flex-1 flex flex-col items-center justify-center w-full">
          <img
            src={logoUrl}
            alt={nomeSistema}
            className="w-56 sm:w-64 h-auto drop-shadow-[0_18px_50px_oklch(0.55_0.21_27_/_0.55)] animate-[fadeUp_700ms_ease-out_both]"
          />
          <p className="mt-7 tracking-[0.28em] text-sm sm:text-base text-[#decdb4] animate-[fadeUp_900ms_ease-out_both]">
            ENTREGAS E COLETAS
          </p>
          {/* Separador estilo medalha */}
          <div className="mt-5 flex items-center gap-3 opacity-80 animate-[fadeUp_1100ms_ease-out_both]">
            <span className="h-px w-12 bg-white/40" />
            <span className="text-primary text-base leading-none">★</span>
            <span className="h-px w-12 bg-white/40" />
          </div>
        </div>

        {/* Botões */}
        <div className="w-full max-w-sm space-y-3 animate-[fadeUp_1300ms_ease-out_both]">
          <Link
            to="/cadastro"
            className="block w-full text-center bg-[#bb1010]/75 shadow-elevated rounded-none py-4 text-lg tracking-[0.18em] text-[#decdb4] hover:bg-[#bb1010]/95 hover:shadow-red hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 ease-premium"
          >
            CADASTRE-SE
          </Link>
          <Link
            to="/login"
            className="block w-full text-center rounded-none py-4 text-lg tracking-[0.22em] text-[#decdb4] border border-white/30 bg-[#003965]/75 hover:bg-[#003965]/95 hover:border-white/50 transition-all duration-300 ease-premium"
          >
            ENTRAR
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          0%   { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .safe-area {
          padding-top: max(4rem, env(safe-area-inset-top));
          padding-bottom: max(2.5rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}
