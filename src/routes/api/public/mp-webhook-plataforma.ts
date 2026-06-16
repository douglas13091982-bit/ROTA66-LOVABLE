import { createFileRoute } from "@tanstack/react-router";

/**
 * @deprecated Use `/api/public/mp-webhook` (endpoint único).
 * Mantido por compatibilidade com configurações antigas no painel do MP.
 */
export const Route = createFileRoute("/api/public/mp-webhook-plataforma")({
  server: {
    handlers: {
      GET: async () => new Response("ok", { status: 200 }),
      POST: async ({ request }) => {
        const { handleMpPlataformaWebhook } = await import("@/lib/mp-webhook-dispatcher.server");
        // strict=false: preserva comportamento anterior tolerante a payloads sem assinatura.
        return handleMpPlataformaWebhook(request, { strict: false });
      },
    },
  },
});
