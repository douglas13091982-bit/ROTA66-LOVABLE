import { createFileRoute } from "@tanstack/react-router";

/**
 * ROTA 66 não processa pagamentos de lojas.
 * Pagamentos comerciais pertencem ao Pixel Palace.
 */
export const Route = createFileRoute("/api/public/mp-webhook/$lojaId")({
  server: {
    handlers: {
      GET: async () =>
        new Response("store payment webhook disabled", {
          status: 410,
          headers: { "Cache-Control": "no-store" },
        }),
      POST: async () =>
        new Response("store payment webhook disabled", {
          status: 410,
          headers: { "Cache-Control": "no-store" },
        }),
    },
  },
});
