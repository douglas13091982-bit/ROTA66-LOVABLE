import { CreditCard, Wallet, CheckCircle2, Calendar, LayoutGrid } from "lucide-react";
import { formatCurrency } from "@/lib/format/currency";

type Props = {
  totalAberto: number;
  totalPago: number;
  mensalidadeValor: number;
  prox: string | undefined;
  onAntecipar: () => void;
};

export function ResumoCards({ totalAberto, totalPago, mensalidadeValor, prox, onAntecipar }: Props) {
  const brl = (v: number) => formatCurrency(v);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Em Aberto */}
      <div className="bg-white border border-border rounded-xl p-6 flex items-start gap-4 shadow-sm">
        <div className="p-3 bg-red-50 rounded-xl">
          <Wallet className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Em aberto</div>
          <div className="text-2xl font-bold text-destructive mt-0.5">{brl(totalAberto)}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Mensalidades em aberto</div>
        </div>
      </div>

      {/* Já Pago */}
      <div className="bg-white border border-border rounded-xl p-6 flex items-start gap-4 shadow-sm">
        <div className="p-3 bg-green-50 rounded-xl">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Já pago</div>
          <div className="text-2xl font-bold text-navy mt-0.5">{brl(totalPago)}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Tudo em dia!</div>
        </div>
      </div>

      {/* Valor Mensalidade */}
      <div className="bg-white border border-border rounded-xl p-6 flex items-start gap-4 shadow-sm">
        <div className="p-3 bg-blue-50 rounded-xl">
          <LayoutGrid className="h-6 w-6 text-blue-500" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Mensalidade</div>
          <div className="text-2xl font-bold text-navy mt-0.5">{brl(mensalidadeValor)}</div>
          <div className="text-[10px] text-muted-foreground mt-1">Por mês</div>
        </div>
      </div>

      {/* Próximo Vencimento */}
      <div className="bg-white border border-border rounded-xl p-6 flex flex-col justify-between shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-50 rounded-xl">
            <Calendar className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Próximo vencimento</div>
            <div className="text-xl font-bold text-navy mt-0.5">
              {prox
                ? new Date(prox + (prox.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR")
                : "—"}
            </div>
          </div>
        </div>
        
        {mensalidadeValor > 0 && (
          <button
            onClick={onAntecipar}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-red-50 text-destructive border border-destructive/20 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Pagar Antecipado
          </button>
        )}
      </div>
    </div>
  );
}
