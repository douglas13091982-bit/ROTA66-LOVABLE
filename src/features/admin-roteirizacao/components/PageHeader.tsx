import { Route as Route2 } from "lucide-react";

export function PageHeader() {
  return (
    <div>
      <h1 className="font-display text-2xl tracking-wide flex items-center gap-2">
        <Route2 className="h-6 w-6 text-primary" />
        Limites de agrupamento
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        Estes limites controlam quando um novo pedido é agrupado em uma rota existente
        em vez de criar uma nova. Um pedido é agrupado se respeitar tempo OU distância extras.
      </p>
    </div>
  );
}
