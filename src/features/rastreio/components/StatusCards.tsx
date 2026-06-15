import { CheckCircle2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";

export function EntregueCard({ confirmadaEm }: { confirmadaEm: string | null }) {
  return (
    <div className="rounded-lg border-2 border-green-600 bg-green-600/5 p-5 text-center">
      <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-2" />
      <p className="font-display text-2xl tracking-wide">Pedido entregue!</p>
      <p className="text-xs text-muted-foreground mt-1">
        {confirmadaEm && formatDateTime(confirmadaEm)}
      </p>
    </div>
  );
}

export function CanceladoCard() {
  return (
    <div className="rounded-lg border-2 border-destructive/50 bg-destructive/5 p-5 text-center">
      <p className="font-display text-2xl text-destructive">Pedido cancelado</p>
    </div>
  );
}
