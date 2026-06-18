import { createFileRoute } from "@tanstack/react-router";
import { ClientesCidadePage } from "@/features/clientes-cidade/ClientesCidadePage";
import type { ClientesCidadeSearch } from "@/features/clientes-cidade/logic/types";

export const Route = createFileRoute("/clientes/$cidade")({
  validateSearch: (s: Record<string, unknown>): ClientesCidadeSearch => ({
    uf: typeof s.uf === "string" ? s.uf : undefined,
  }),
  component: ClientesCidadeRoute,
  head: ({ params }) => {
    const cidade = decodeURIComponent(params.cidade);
    return {
      meta: [
        { title: `Lojas em ${cidade}` },
        { name: "description", content: `Veja todas as lojas disponíveis em ${cidade}.` },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { name: "theme-color", content: "#cc2229" },
        { name: "apple-mobile-web-app-title", content: "ROTA 66 Cliente" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "mobile-web-app-capable", content: "yes" },
      ],
      links: [
        { rel: "manifest", href: "/manifest-cliente.webmanifest" },
      ],
    };
  },
});

function ClientesCidadeRoute() {
  const { cidade } = Route.useParams();
  const { uf } = Route.useSearch();
  return <ClientesCidadePage cidade={decodeURIComponent(cidade)} uf={uf} />;
}
