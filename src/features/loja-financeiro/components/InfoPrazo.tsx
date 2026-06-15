export function InfoPrazo({ prazo }: { prazo: number }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 text-sm text-muted-foreground">
      A cada pedido entregue é gerada uma taxa para o sistema, com prazo de{" "}
      <strong className="text-foreground">{prazo} dias</strong>. Além disso, a loja paga uma{" "}
      <strong className="text-foreground">mensalidade fixa</strong> para utilizar a plataforma.
    </div>
  );
}
