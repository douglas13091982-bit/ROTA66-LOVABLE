import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint legado mantido apenas para compatibilidade com configurações
 * antigas do Mercado Pago. O dispatcher agora processa somente referências
 * financeiras do ROTA 66 ligadas a entregadores.
 */
export const Route = createFileRoute("/api/public/mp-webhook-plataforma")({
  server: {
    handlers: {
      GET: async () => new Response("ok", { status: 200 }),
      POST: async ({ request }) => {
        const { handleMpPlataformaWebhook } = await import(
          "@/lib/mp-webhook-dispatcher.server"
        );
        return handleMpPlataformaWebhook(request, { strict: true });
      },
    },
  },
});
