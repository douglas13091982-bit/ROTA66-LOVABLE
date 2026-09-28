import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook do Mercado Pago usado somente para a operação financeira logística
 * do ROTA 66, como recargas/créditos de entregadores.
 *
 * Pedidos, pagamentos de clientes, mensalidades e cobranças de lojas
 * pertencem ao Pixel Palace e não são processados aqui.
 */
export const Route = createFileRoute("/api/public/mp-webhook")({
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
