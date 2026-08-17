/**
 * O SENHOR E MEU PASTOR E NADA ME FALTARA, JESUS E REI! DEUS E PAI!
 */
import { createFileRoute } from "@tanstack/react-router";
import { SplashEntregadorPage } from "@/features/splash/SplashEntregadorPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ROTA 66 APP" },
      { name: "description", content: "ROTA 66 APP — Entregas sem fronteiras." },
      { property: "og:title", content: "ROTA 66 APP" },
      { property: "og:description", content: "Entregas sem fronteiras." },
    ],
  }),
  component: SplashEntregadorPage,
});
