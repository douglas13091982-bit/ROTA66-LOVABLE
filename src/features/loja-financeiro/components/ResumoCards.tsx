import { CreditCard } from "lucide-react";

type Props = {
  totalAberto: number;
  totalPago: number;
  mensalidadeValor: number;
  prox: string | undefined;
  onAntecipar: () => void;
};

export function ResumoCards({ totalAberto, totalPago, mensalidadeValor, prox, onAntecipar }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Em aberto</div>
        <div className="font-display text-3xl text-primary mt-1">R$ {totalAberto.toFixed(2)}</div>
      </div>
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Já pago</div>
        <div className="font-display text-3xl mt-1">R$ {totalPago.toFixed(2)}</div>
      </div>
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Mensalidade</div>
        <div className="font-display text-2xl mt-1">R$ {mensalidadeValor.toFixed(2)}</div>
        <div className="text-[10px] text-muted-foreground mt-1">por mês</div>
      </div>
      <div className="bg-card border border-border rounded-lg p-5 flex flex-col justify-between">
        <div>
          <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Próximo vencimento</div>
          <div className="font-display text-xl mt-1">
            {prox
              ? new Date(prox + (prox.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR")
              : "—"}
          </div>
        </div>
        
        {mensalidadeValor > 0 && (
          <button
            onClick={onAntecipar}
            className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
          >
            <CreditCard className="h-3 w-3" />
            Pagar Antecipado
          </button>
        )}
      </div>
    </div>
  );
}
