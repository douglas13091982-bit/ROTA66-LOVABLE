import roadBg from "@/assets/splash-road.webp";
import roadBgDesktop from "@/assets/estrada-desktop.png.asset.json";

export function SplashBackground() {
  return (
    <>
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
    </>
  );
}
