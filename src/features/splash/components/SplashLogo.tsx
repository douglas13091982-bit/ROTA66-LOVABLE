interface Props {
  logoUrl: string;
  nomeSistema: string;
}

export function SplashLogo({ logoUrl, nomeSistema }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full">
      <img
        src={logoUrl}
        alt={nomeSistema}
        className="w-56 sm:w-64 h-auto drop-shadow-[0_18px_50px_oklch(0.55_0.21_27_/_0.55)] animate-[fadeUp_700ms_ease-out_both]"
      />
      <p className="mt-7 tracking-[0.28em] text-sm sm:text-base text-[#decdb4] animate-[fadeUp_900ms_ease-out_both]">
        SEU NOVO DELIVERY
      </p>
      <div className="mt-5 flex items-center gap-3 opacity-80 animate-[fadeUp_1100ms_ease-out_both]">
        <span className="h-px w-12 bg-white/40" />
        <span className="text-primary text-base leading-none">★</span>
        <span className="h-px w-12 bg-white/40" />
      </div>
    </div>
  );
}
