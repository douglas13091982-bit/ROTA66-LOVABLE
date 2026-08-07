import { MapPin } from "lucide-react";

interface Props {
  endereco: string;
  complemento: string | null;
}

export function EnderecoEntregaCard({ endereco, complemento }: Props) {
  return (
    <div className="bg-white border border-[#0d2c54]/10 rounded-none p-4 shadow-sm text-sm space-y-1 text-[#0d2c54]">
      <div className="text-[10px] uppercase tracking-wider text-[#0d2c54]/50 font-bold">
        Endereço de entrega
      </div>
      <div className="flex items-start gap-2">
        <MapPin className="h-4 w-4 mt-0.5 text-[#e3000f] shrink-0" />
        <span className="font-medium leading-tight">
          {endereco}
          {complemento ? ` (${complemento})` : ""}
        </span>
      </div>
    </div>
  );
}
