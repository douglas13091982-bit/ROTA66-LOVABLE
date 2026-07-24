import { createFileRoute } from "@tanstack/react-router";
import { MapaEntregadoresLojaPage } from "@/features/loja-mapa/MapaEntregadoresLojaPage";

export const Route = createFileRoute("/_authenticated/loja/mapa")({
  component: MapaEntregadoresLojaPage,
});
