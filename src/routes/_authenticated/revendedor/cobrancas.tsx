import { createFileRoute } from "@tanstack/react-router";
import { RevendedorCobrancasPage } from "@/features/revendedor-cobrancas/RevendedorCobrancasPage";

export const Route = createFileRoute("/_authenticated/revendedor/cobrancas")({
  component: RevendedorCobrancasPage,
});
