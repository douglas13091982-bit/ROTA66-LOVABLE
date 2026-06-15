import { createFileRoute } from "@tanstack/react-router";
import { BaixarAppPage } from "@/features/baixar-app/BaixarAppPage";

export const Route = createFileRoute("/baixar-app")({
  head: () => ({
    meta: [
      { title: "Baixar o app — ROTA 66" },
      { name: "description", content: "Baixe o aplicativo para entregadores ROTA 66 direto no seu celular." },
    ],
  }),
  component: BaixarAppPage,
});
