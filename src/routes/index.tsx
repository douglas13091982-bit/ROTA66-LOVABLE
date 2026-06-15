import { createFileRoute } from "@tanstack/react-router";
import { SplashEntregadorPage } from "@/features/splash/SplashEntregadorPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ROTA 66 — Entregas sem fronteiras" },
      { name: "description", content: "App do entregador ROTA 66. Acelera, a rota é sua." },
      { property: "og:title", content: "ROTA 66 — App do Entregador" },
      { property: "og:description", content: "Entregas sem fronteiras." },
    ],
  }),
  component: SplashEntregadorPage,
});
