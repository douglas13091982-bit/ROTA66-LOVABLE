import { Route as RouteIcon } from "lucide-react";

export function RotaAtivaEstado({ onVerRota }: { onVerRota: () => void }) {
  return (
    <div className="text-center py-12">
      <RouteIcon className="h-16 w-16 text-white/80 mx-auto mb-4" />
      <p className="font-display text-2xl tracking-wide mb-2 text-white">
        Você já tem uma rota ativa
      </p>
      <p className="text-white/60 text-sm mb-6">
        Finalize a rota atual para receber novos pedidos.
      </p>
      <button
        onClick={onVerRota}
        className="px-5 py-2.5 bg-[#AE0000] !text-white font-bold uppercase text-xs tracking-wider rounded-md hover:opacity-90 transition-opacity"
      >
        Ver minha rota
      </button>
    </div>
  );
}
