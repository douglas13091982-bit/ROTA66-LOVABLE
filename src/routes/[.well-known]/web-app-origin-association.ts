import { createFileRoute } from "@tanstack/react-router";

// Validação das scope_extensions declaradas nos manifests.
// Servido em /.well-known/web-app-origin-association em cada origem associada.
// Sem este arquivo o navegador ignora as scope_extensions e mostra a barra
// de endereço ao navegar para os domínios extras dentro do app instalado.

const ORIGIN_ASSOCIATION = {
  web_apps: [
    { web_app_identity: "https://rotas66.com.br" },
    { web_app_identity: "https://www.rotas66.com.br" },
    { web_app_identity: "https://rotas66.lovable.app" },
  ],
};

export const Route = createFileRoute("/.well-known/web-app-origin-association")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify(ORIGIN_ASSOCIATION), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});
