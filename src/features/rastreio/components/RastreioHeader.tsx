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
}: Props) {
  return (
    <>
      <div className="flex justify-center pt-4">
        <img src={logoUrl} alt={nomeSistema} className="h-14 w-auto object-contain" />
      </div>
      <header className="text-center text-[#0d2c54] space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#0d2c54]/50 font-bold mb-1">{lojaNome}</p>
          <h1 className="font-display text-2xl tracking-tight font-bold">Pedido #{numero}</h1>
          <p className="text-sm text-[#0d2c54]/60 mt-0.5 italic">Olá, {clienteNome}</p>
        </div>

        {entregadorNome && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-full animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="h-7 w-7 rounded-full bg-[#0d2c54] flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-[9px] uppercase tracking-tighter text-[#0d2c54]/50 font-bold leading-none">Entregador parceiro</p>
              <p className="text-sm font-bold text-[#0d2c54] uppercase tracking-tight">{entregadorNome}</p>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
