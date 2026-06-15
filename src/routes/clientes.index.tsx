import { createFileRoute } from "@tanstack/react-router";
import { ClientesIndexPage } from "@/features/clientes-index/ClientesIndexPage";

export const Route = createFileRoute("/clientes/")({
  component: ClientesIndexPage,
  head: () => ({
    meta: [
      { title: "Encontre lojas perto de você" },
      { name: "description", content: "Descubra lojas, restaurantes e mercados disponíveis na sua cidade." },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#ffffff" },
    ],
  }),
});
