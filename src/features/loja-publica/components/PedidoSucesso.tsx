import { CheckCircle2 } from "lucide-react";

interface Props {
  numero: number;
  onNovoPedido: () => void;
}

export function PedidoSucesso({ numero, onNovoPedido }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center shadow-card">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h1 className="font-display text-3xl mb-2">Pedido enviado!</h1>
        <p className="text-muted-foreground mb-1">Seu pedido</p>
        <p className="font-display text-5xl text-primary mb-4">#{numero}</p>
        <p className="text-sm text-muted-foreground mb-6">
          A loja já recebeu seu pedido e entrará em contato pelo telefone informado.
        </p>
        <button
          onClick={onNovoPedido}
          className="w-full px-5 py-3 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase tracking-wider rounded-md hover:opacity-90"
        >
          Fazer outro pedido
        </button>
      </div>
    </div>
  );
}
