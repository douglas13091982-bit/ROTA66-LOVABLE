import { MapPin, Phone } from "lucide-react";
import type { LojaPublica } from "../logic/types";

export function LojaHeader({ loja }: { loja: LojaPublica }) {
  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-2xl mx-auto p-6 flex items-center gap-4">
        {loja.logo_url && (
          <img src={loja.logo_url} alt={loja.nome} className="h-14 w-14 rounded-md object-cover" />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl md:text-3xl tracking-wide truncate">{loja.nome}</h1>
          <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
            {loja.endereco && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> {loja.endereco}
                {loja.cidade ? `, ${loja.cidade}` : ""}
                {loja.estado ? `/${loja.estado}` : ""}
              </div>
            )}
            {loja.telefone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> {loja.telefone}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
