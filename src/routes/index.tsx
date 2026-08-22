import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  loader: () => {
    // Redireciona para a página de seleção de cidade ou marketplace detectado
    throw redirect({ to: "/clientes" });
  },
});
