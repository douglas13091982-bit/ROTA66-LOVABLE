import { CheckCircle2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";

export function EntregueCard({ confirmadaEm }: { confirmadaEm: string | null }) {
  return (
    <div className="rounded-none border-2 border-emerald-600 bg-emerald-50 p-5 text-center">
      <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
      <p className="font-display text-2xl tracking-wide text-[#0d2c54] font-bold">Pedido entregue!</p>
      <p className="text-xs text-[#0d2c54]/60 mt-1">
        {confirmadaEm && formatDateTime(confirmadaEm)}
      </p>
    </div>
  );
}

export function CanceladoCard() {
  return (
    <div className="rounded-none border-2 border-[#e3000f] bg-red-50 p-5 text-center">
      <p className="font-display text-2xl text-[#e3000f] font-bold">Pedido cancelado</p>
    </div>
  );
}
