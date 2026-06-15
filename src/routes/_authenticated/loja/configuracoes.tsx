import { createFileRoute } from "@tanstack/react-router";
import { ConfigPage } from "@/features/loja-configuracoes/ConfigPage";

export const Route = createFileRoute("/_authenticated/loja/configuracoes")({
  component: ConfigPage,
});
