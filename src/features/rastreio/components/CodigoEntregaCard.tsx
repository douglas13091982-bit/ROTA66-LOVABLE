import { KeyRound } from "lucide-react";

export function CodigoEntregaCard({ codigo }: { codigo: string }) {
  return (
    <div className="rounded-lg border-2 border-primary bg-primary/5 p-5 text-center shadow-card">
      <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
        <KeyRound className="h-3.5 w-3.5" /> Seu código de entrega
      </div>
      <div className="font-display text-6xl tracking-[0.4em] text-primary mb-2 select-all">
        {codigo}
      </div>
      <p className="text-xs text-muted-foreground">
        Informe este código ao entregador quando ele chegar para confirmar a entrega.
      </p>
    </div>
  );
}
