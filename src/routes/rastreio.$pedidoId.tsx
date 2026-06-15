import { createFileRoute } from "@tanstack/react-router";
import { RastreioPage } from "@/features/rastreio/RastreioPage";

export const Route = createFileRoute("/rastreio/$pedidoId")({
  component: RastreioRoute,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <p className="font-display text-2xl mb-2">Não foi possível carregar</p>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="font-display text-2xl">Pedido não encontrado</p>
    </div>
  ),
});

function RastreioRoute() {
  const { pedidoId } = Route.useParams();
  return <RastreioPage pedidoId={pedidoId} />;
}
