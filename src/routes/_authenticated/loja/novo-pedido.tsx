import { createFileRoute } from "@tanstack/react-router";
import { NovoPedidoPage } from "@/features/loja-novo-pedido/NovoPedidoPage";

export const Route = createFileRoute("/_authenticated/loja/novo-pedido")({
  component: NovoPedidoPage,
});
