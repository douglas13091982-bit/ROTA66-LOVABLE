import { useBranding } from "@/hooks/use-branding";
import { useAutoRedirectByRole } from "./hooks/use-auto-redirect-by-role";
import { SplashBackground } from "./components/SplashBackground";
import { SplashLogo } from "./components/SplashLogo";
import { SplashActions } from "./components/SplashActions";

export function SplashEntregadorPage() {
  const { logoUrl, nomeSistema } = useBranding();
  useAutoRedirectByRole();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a1428] text-foreground flex flex-col">
      <SplashBackground />

      <div className="relative z-10 flex flex-1 flex-col items-center px-6 pt-16 pb-10 safe-area">
        <SplashLogo logoUrl={logoUrl} nomeSistema={nomeSistema} />
        <SplashActions />
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
