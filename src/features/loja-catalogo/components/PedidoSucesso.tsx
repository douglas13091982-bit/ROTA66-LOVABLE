import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

export function PedidoSucesso({
  pedido,
  onVoltar,
}: {
  pedido: { id: string; numero: number };
  onVoltar: () => void;
}) {
  return (
    <div className="catalogo-clean min-h-screen flex items-center justify-center bg-background p-6">
      <div className="cc-card rounded-3xl p-8 max-w-md w-full text-center cc-reveal">
        <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center ring-1 ring-emerald-200">
          <CheckCircle2 className="h-9 w-9 text-emerald-600" strokeWidth={2.2} />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-1">Pedido confirmado</p>
        <h1 className="font-display text-3xl mb-3 cc-ink-text">Obrigado!</h1>
        <p className="text-sm text-muted-foreground mb-1">Seu número de pedido</p>
        <p className="font-display text-6xl text-primary mb-1 tracking-tighter tabular-nums">#{pedido.numero}</p>
        <div className="cc-divider-gold my-5" />
        <p className="text-sm text-muted-foreground mb-6">A loja recebeu seu pedido. Acompanhe em tempo real abaixo.</p>
        <Link
          to="/rastreio/$pedidoId"
          params={{ pedidoId: pedido.id }}
          className="cc-cta block w-full px-5 py-4 rounded-2xl font-semibold uppercase text-[12px] tracking-[0.18em] mb-2"
        >
          Acompanhar pedido
        </Link>
        <button
          onClick={onVoltar}
          className="text-[11px] text-muted-foreground hover:text-foreground uppercase tracking-[0.18em] py-2 font-medium"
        >
          Voltar ao catálogo
        </button>
      </div>
    </div>
  );
}
