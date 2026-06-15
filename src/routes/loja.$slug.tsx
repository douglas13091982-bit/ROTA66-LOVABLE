import { createFileRoute } from "@tanstack/react-router";
import { LojaPublicaPage } from "@/features/loja-publica/LojaPublicaPage";

export const Route = createFileRoute("/loja/$slug")({
  component: LojaPublicaRoute,
});

function LojaPublicaRoute() {
  const { slug } = Route.useParams();
  return <LojaPublicaPage slug={slug} />;
}
