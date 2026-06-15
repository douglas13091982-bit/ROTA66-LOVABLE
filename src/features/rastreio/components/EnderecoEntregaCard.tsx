import { MapPin } from "lucide-react";

interface Props {
  endereco: string;
  complemento: string | null;
}

export function EnderecoEntregaCard({ endereco, complemento }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-card text-sm space-y-2">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
        Endereço de entrega
      </div>
      <div className="flex items-start gap-2">
        <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <span>
          {endereco}
          {complemento ? `, ${complemento}` : ""}
        </span>
      </div>
    </div>
  );
}
