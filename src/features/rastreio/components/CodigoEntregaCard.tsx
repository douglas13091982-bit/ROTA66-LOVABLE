import { KeyRound } from "lucide-react";

export function CodigoEntregaCard({ codigo }: { codigo: string }) {
  return (
    <div className="rounded-none border-2 border-[#0d2c54] bg-[#0d2c54] p-5 text-center shadow-lg">
      <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-wider text-white/70 mb-2">
        <KeyRound className="h-3.5 w-3.5" /> Seu código de entrega
      </div>
      <div className="font-display text-6xl tracking-[0.2em] font-bold text-white mb-2 select-all">
        {codigo}
      </div>
      <p className="text-xs text-white/60">
        Informe este código ao entregador quando ele chegar para confirmar a entrega.
      </p>
    </div>
  );
}
