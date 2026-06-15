import { createFileRoute } from "@tanstack/react-router";
import { CatalogoPage } from "@/features/loja-catalogo/CatalogoPage";

export const Route = createFileRoute("/c/$slug")({
  component: CatalogoRoute,
  head: ({ params }) => ({
    meta: [
      { title: `Catálogo — ${params.slug}` },
      { name: "description", content: "Faça seu pedido online" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#ffffff" },
    ],
  }),
});

function CatalogoRoute() {
  const { slug } = Route.useParams();
  return <CatalogoPage slug={slug} />;
}
