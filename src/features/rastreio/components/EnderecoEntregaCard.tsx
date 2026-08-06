import { MapPin } from "lucide-react";

interface Props {
  endereco: string;
  complemento: string | null;
}

export function EnderecoEntregaCard({ endereco, complemento }: Props) {
  return (
    <div className="bg-white border border-[#0d2c54]/10 rounded-none p-5 shadow-sm text-sm space-y-2 text-[#0d2c54]">
      <div className="text-xs uppercase tracking-wider text-[#0d2c54]/50 font-bold mb-1">
        Endereço de entrega
      </div>
      <div className="flex items-start gap-2">
        <MapPin className="h-4 w-4 mt-0.5 text-[#AE0000] shrink-0" />
        <span>
          {endereco}
          {complemento ? `, ${complemento}` : ""}
        </span>
      </div>
    </div>
  );
}
