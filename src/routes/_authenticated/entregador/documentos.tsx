import { createFileRoute } from "@tanstack/react-router";
import { DocumentosPage } from "@/features/entregador-documentos/DocumentosPage";

export const Route = createFileRoute("/_authenticated/entregador/documentos")({
  head: () => ({ meta: [{ title: "Documentos — ROTA 66" }] }),
  component: DocumentosPage,
});
