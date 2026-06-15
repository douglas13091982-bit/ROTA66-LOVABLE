type Props = {
  totalAberto: number;
  totalPago: number;
  mensalidadeValor: number;
  prox: string | undefined;
};

export function ResumoCards({ totalAberto, totalPago, mensalidadeValor, prox }: Props) {
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
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Próximo vencimento</div>
        <div className="font-display text-xl mt-1">
          {prox
            ? new Date(prox + (prox.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR")
            : "—"}
        </div>
      </div>
    </div>
  );
}
