import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ONESIGNAL_APP_ID = "e9e73215-0750-464d-859e-674e97f00a68";

const InputSchema = z.object({
  entregador_id: z.string().uuid(),
  title: z.string().min(1).max(120),
  body: z.string().max(500).default(""),
  url: z.string().max(500).default("/entregador/ativos"),
});

export type OneSignalTestResult = {
  ok: boolean;
  status: number;
  response: unknown;
  request: {
    app_id: string;
    external_id: string;
    title: string;
    body: string;
    url: string;
  };
};

export const enviarPushTesteOneSignal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => InputSchema.parse(d))
  .handler(async ({ data, context }): Promise<OneSignalTestResult> => {
    const { userId, supabase } = context as any;

    // Autorização: só admin / super_admin podem disparar push de teste.
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    const { data: isSuper } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "super_admin",
    });
    if (!isAdmin && !isSuper) {
      throw new Error("Acesso negado: apenas admin pode enviar push de teste");
    }

    const key = process.env.ONESIGNAL_REST_API_KEY;
    if (!key) throw new Error("ONESIGNAL_REST_API_KEY não configurada");

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_aliases: { external_id: [data.entregador_id] },
      target_channel: "push",
      headings: { en: data.title, pt: data.title },
      contents: { en: data.body || " ", pt: data.body || " " },
      url: data.url ? `https://rotas66.lovable.app${data.url}` : undefined,
      data: { url: data.url || "/entregador/ativos" },
      priority: 10,
    };

    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Key ${key}`,
      },
      body: JSON.stringify(payload),
    });

    let parsed: unknown;
    const text = await res.text();
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }

    return {
      ok: res.ok,
      status: res.status,
      response: parsed,
      request: {
        app_id: ONESIGNAL_APP_ID,
        external_id: data.entregador_id,
        title: data.title,
        body: data.body,
        url: data.url,
      },
    };
  });
