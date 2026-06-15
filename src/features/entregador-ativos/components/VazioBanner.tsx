import { Bike } from "lucide-react";

export function VazioBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl glass shadow-soft p-12 text-center">
      <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <Bike className="relative h-16 w-16 text-muted-foreground mx-auto mb-4" />
      <p className="relative font-display text-2xl tracking-[0.06em] mb-2">
        Nenhuma entrega em andamento
      </p>
      <p className="relative text-muted-foreground text-sm">
        Vá para a aba Pedidos e aceite um pedido.
      </p>
    </div>
  );
}
