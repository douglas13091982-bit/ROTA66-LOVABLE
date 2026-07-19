import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


/**
 * Envia uma notificação push de teste para o próprio usuário autenticado,
 * reutilizando o endpoint /api/public/send-push (que já contém toda a
 * lógica de VAPID + criptografia RFC 8291).
 */
export const enviarPushTeste = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Recupera o segredo compartilhado usado pelo endpoint público.
    const { data: cfgRow } = await supabaseAdmin
      .from("private_config" as any)
      .select("value")
      .eq("key", "push_trigger_secret")
      .maybeSingle();
    const secret = (cfgRow as any)?.value as string | undefined;
    if (!secret) {
      throw new Error("push_trigger_secret não configurado");
    }

    // Verifica se o usuário tem alguma inscrição push ativa.
    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", context.userId);
    if (!subs || subs.length === 0) {
      return { sent: 0, subscriptions: 0 };
    }

    const host = process.env.PUBLIC_HOST?.trim() || getRequestHost();
    const url = `https://${host}/api/public/send-push`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-push-secret": secret,
      },
      body: JSON.stringify({
        user_id: context.userId,
        title: "Rota 66 — Teste de notificação",
        body: "Se você recebeu esta mensagem, as notificações estão funcionando!",
        url: "/entregador/disponiveis",
      }),
    });

    if (!res.ok) {
      throw new Error(`Falha ao enviar push (${res.status})`);
    }
    const json = (await res.json()) as { sent: number };
    return { sent: json.sent ?? 0, subscriptions: subs.length };
  });
