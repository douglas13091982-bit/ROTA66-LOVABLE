import { Bike } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export function VazioBanner() {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-soft p-12 text-center border border-border/40">
      <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <Bike className="relative h-16 w-16 text-muted-foreground mx-auto mb-4" />
      <p className="relative font-display text-2xl tracking-[0.06em] mb-2">
        Nenhuma entrega em andamento
      </p>
      <p className="relative text-muted-foreground text-sm mb-5">
        Volte para os pedidos disponíveis e aceite uma nova entrega.
      </p>
      <button
        onClick={() => navigate({ to: "/entregador/disponiveis", replace: true })}
        className="relative w-full px-4 py-3 rounded-xl bg-[#e3000f] !text-white font-bold uppercase text-xs tracking-[0.16em]"
      >
        Ver pedidos disponíveis
      </button>
    </div>
  );
}
