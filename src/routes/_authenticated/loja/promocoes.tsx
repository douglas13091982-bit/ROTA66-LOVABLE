import { createFileRoute } from "@tanstack/react-router";
import { PromocoesLojaPage } from "@/features/loja-promocoes/PromocoesLojaPage";

export const Route = createFileRoute("/_authenticated/loja/promocoes")({
  component: PromocoesLojaPage,
});
