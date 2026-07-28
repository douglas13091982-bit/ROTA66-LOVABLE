import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

// Chave pública VAPID (segura para ficar no client)
const VAPID_PUBLIC_KEY =
  "BACtRKxjU08cKUmmZREMClwrawTLq9itz6QFLXVkMOcNMTis61hk7ZGfb_JcwcrRBDYynq3_aKl1KutWAgRti3k";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bufToB64Url(buf: ArrayBuffer | null) {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getExistingPushSubscriptions() {
  const regs = await navigator.serviceWorker.getRegistrations();
  const subs: PushSubscription[] = [];
async function waitForActive(reg: ServiceWorkerRegistration) {
  if (reg.active) return;
  const sw = reg.installing ?? reg.waiting;
  if (!sw) {
    await navigator.serviceWorker.ready;
    return;
  }
  await new Promise<void>((resolve) => {
    const done = () => {
      if (sw.state === "activated" || sw.state === "redundant") {
        sw.removeEventListener("statechange", done);
        resolve();
      }
    };
    sw.addEventListener("statechange", done);
    setTimeout(resolve, 8000);
    done();
  });
}


  for (const reg of regs) {
    try {
      const sub = await reg.pushManager.getSubscription();
      if (sub) subs.push(sub);
    } catch {}
  }

  return subs;
}

export type PushState = "unsupported" | "denied" | "granted" | "default" | "loading";

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    try {
      const subs = await getExistingPushSubscriptions();
      const sub = subs[0];
      if (Notification.permission === "granted" && sub) setState("granted");
      else setState("default");
    } catch {
      setState("default");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!user?.id) throw new Error("Faça login novamente para ativar as notificações.");
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported");
      throw new Error("Este app/navegador não suporta notificações push.");
    }
    setBusy(true);
    try {
      // IMPORTANTE (TWA/Android): o pedido de permissão precisa acontecer
      // ainda dentro do gesto do usuário. Se registrarmos o service worker
      // antes, o Chrome perde o "user activation" e o prompt é ignorado
      // silenciosamente — que é o caso do APK TWA.
      let perm: NotificationPermission = Notification.permission;
      if (perm !== "granted") {
        perm = await Notification.requestPermission();
      }
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "default");
        throw new Error(
          perm === "denied"
            ? "Permissão negada. Abra Configurações do Android → Apps → ROTA 66 → Notificações e ative."
            : "Permissão não concedida. Toque novamente e escolha Permitir."
        );
      }

      const reg = await navigator.serviceWorker.register("/sw-push.js");
      // navigator.serviceWorker.ready pode resolver com OUTRA registration
      // (ex.: /sw.js). Esperamos especificamente o /sw-push.js ficar ativo,
      // senão pushManager.subscribe falha com InvalidStateError no TWA.
      await waitForActive(reg);



      // O navegador mantém apenas uma assinatura Push por origem, não por
      // arquivo de service worker. Se existia assinatura antiga no sw.js ou
      // com uma chave VAPID antiga, ela recebia 200/FCM mas nenhum handler
      // mostrava a notificação no app instalado. Por isso varremos todas as
      // registrations e recriamos qualquer assinatura incompatível.
      const existingSubs = await getExistingPushSubscriptions();
      let sub: PushSubscription | null = existingSubs[0] ?? null;
      for (const existing of existingSubs) {
        const currentKey = bufToB64Url(existing.options.applicationServerKey ?? null);
        const expected = VAPID_PUBLIC_KEY.replace(/=+$/, "");
        if (currentKey !== expected) {
          try { await existing.unsubscribe(); } catch {}
          if (existing === sub) sub = null;
        } else if (existing !== sub) {
          try { await existing.unsubscribe(); } catch {}
        }
      }

      if (sub) {
        const currentKey = bufToB64Url(sub.options.applicationServerKey ?? null);
        const expected = VAPID_PUBLIC_KEY.replace(/=+$/, "");
        if (currentKey !== expected) {
          try { await sub.unsubscribe(); } catch {}
          sub = null;
        }
      }

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const endpoint = sub.endpoint;
      const p256dh = bufToB64Url(sub.getKey("p256dh"));
      const auth = bufToB64Url(sub.getKey("auth"));

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: "endpoint" }
      );
      if (error) throw error;
      setState("granted");
    } catch (err) {
      console.error("[push] enable error:", err);
      throw err;
    } finally {
      setBusy(false);
    }
  }, [user?.id]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const subs = await getExistingPushSubscriptions();
      for (const sub of subs) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        try { await sub.unsubscribe(); } catch {}
      }
      setState("default");
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable, disable, refresh };
}
