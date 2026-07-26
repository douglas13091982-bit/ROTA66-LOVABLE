import { createFileRoute } from "@tanstack/react-router";

// Endpoint público chamado pelo trigger do banco (pg_net) para enviar
// notificações Web Push aos entregadores. Autentica via header `x-push-secret`.
// A lógica de envio vive em src/lib/web-push.server.ts e é usada direto
// (sem HTTP) pelos server functions do app.

export const Route = createFileRoute("/api/public/send-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secretHeader = request.headers.get("x-push-secret");
        if (!secretHeader) {
          return new Response("unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: cfgRow } = await supabaseAdmin
          .from("private_config" as any)
          .select("value")
          .eq("key", "push_trigger_secret")
          .maybeSingle();
        const expected = (cfgRow as any)?.value as string | undefined;
        if (!expected) return new Response("not configured", { status: 500 });
        const a = new TextEncoder().encode(secretHeader);
        const b = new TextEncoder().encode(expected);
        let diff = a.length ^ b.length;
        for (let i = 0; i < Math.min(a.length, b.length); i++) diff |= a[i] ^ b[i];
        if (diff !== 0) {
          return new Response("unauthorized", { status: 401 });
        }

        let payload: {
          user_id?: string;
          title?: string;
          body?: string;
          url?: string;
          image?: string;
          tag?: string;
        };
        try {
          payload = await request.json();
        } catch {
          return new Response("invalid json", { status: 400 });
        }
        if (!payload.user_id || !payload.title) {
          return new Response("missing fields", { status: 400 });
        }

        const { enviarPushParaUsuario } = await import("@/lib/web-push.server");
        try {
          const { sent } = await enviarPushParaUsuario({
            user_id: payload.user_id,
            title: payload.title,
            body: payload.body,
            url: payload.url,
            image: payload.image,
            tag: payload.tag,
          });
          return Response.json({ sent });
        } catch (e: any) {
          console.error("[send-push] falha", e?.message || e);
          return new Response("db error", { status: 500 });
        }
      },
    },
  },
});
