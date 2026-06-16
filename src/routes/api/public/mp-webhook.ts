import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook ÚNICO do Mercado Pago da plataforma.
 *
 * Esta única URL recebe TODOS os eventos da conta MP da plataforma:
 *   - mensalidades das lojas         (external_reference = "mensalidade:<id>")
 *   - recargas/mensalidades de entregadores (external_reference = "recarga:<id>")
 *
 * Cadastre apenas esta URL no painel do Mercado Pago, evento "Pagamentos".
 * Configuração: Admin → Financeiro → Mercado Pago da plataforma.
 *
 * Endpoints antigos (`/mp-webhook-plataforma` e `/mp-webhook-entregador`)
 * continuam funcionando por compatibilidade — todos delegam ao mesmo dispatcher.
 */
export const Route = createFileRoute("/api/public/mp-webhook")({
  server: {
    handlers: {
      GET: async () => new Response("ok", { status: 200 }),
      POST: async ({ request }) => {
        const { handleMpPlataformaWebhook } = await import("@/lib/mp-webhook-dispatcher.server");
        return handleMpPlataformaWebhook(request, { strict: true });
      },
    },
  },
});
