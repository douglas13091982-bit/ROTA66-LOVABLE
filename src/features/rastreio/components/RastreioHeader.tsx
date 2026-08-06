import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface Props {
  logoUrl: string;
  nomeSistema: string;
  lojaNome: string;
  numero: string | number;
  clienteNome: string;
  entregadorNome?: string | null;
  entregadorFoto?: string | null;
}

export function RastreioHeader({ 
  logoUrl, 
  nomeSistema, 
  lojaNome, 
  numero, 
  clienteNome,
  entregadorNome,
  entregadorFoto
}: Props) {
  return (
    <>
      <div className="flex justify-center pt-4">
        <img src={logoUrl} alt={nomeSistema} className="h-16 w-auto object-contain" />
      </div>
      <header className="text-center text-[#0d2c54] space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#0d2c54]/70">{lojaNome}</p>
          <h1 className="font-display text-3xl tracking-wide font-bold">Pedido #{numero}</h1>
          <p className="text-sm text-[#0d2c54]/60 mt-1 italic">Olá, {clienteNome}</p>
        </div>

        {entregadorNome && (
          <div className="flex flex-col items-center gap-2 pt-2 animate-in fade-in slide-in-from-top-4 duration-500">
            <Avatar className="h-16 w-16 border-2 border-[#AE0000]/20">
              <AvatarImage src={entregadorFoto || undefined} alt={entregadorNome} className="object-cover" />
              <AvatarFallback className="bg-gray-100 text-[#0d2c54]">
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-tighter text-[#0d2c54]/50 font-bold">Entregador parceiro</p>
              <p className="text-base font-bold text-[#0d2c54] uppercase tracking-tight">{entregadorNome}</p>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
