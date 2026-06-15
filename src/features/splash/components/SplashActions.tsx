import { Link } from "@tanstack/react-router";

export function SplashActions() {
  return (
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
  );
}
