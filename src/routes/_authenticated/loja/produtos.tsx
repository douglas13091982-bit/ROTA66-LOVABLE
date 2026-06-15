import { createFileRoute } from "@tanstack/react-router";
import { ProdutosPage } from "@/features/loja-produtos/ProdutosPage";

export const Route = createFileRoute("/_authenticated/loja/produtos")({
  component: ProdutosPage,
});
