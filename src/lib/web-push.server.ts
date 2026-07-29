// Envio de Web Push (VAPID + RFC 8291) — módulo server-only.
// Antes essa lógica vivia apenas dentro da rota /api/public/send-push e todos
// os server functions faziam um fetch HTTP para si mesmos. Isso falhava em
// ambientes onde o host interno não é alcançável (preview/dev), deixando os
// logs em "pending" e nenhum push saindo. Agora a lógica é chamada direto
// em processo; a rota pública ficou só como wrapper para o pg_net/trigger.

export type PushInput = {
  user_id: string;
  title: string;
  body?: string;
  url?: string;
  image?: string;
  tag?: string;
};

export async function enviarPushParaUsuario(input: PushInput): Promise<{ sent: number; subs: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const vapidPublic = process.env.VAPID_PUBLIC_KEY!;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY!;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:contato@rota66.app";
  if (!vapidPrivate || !vapidPublic) {
    console.error("[send-push] VAPID keys not configured");
    return { sent: 0, subs: 0 };
  }

  const { data: allSubs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, user_agent, created_at")
    .eq("user_id", input.user_id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[send-push] db error", error);
    throw new Error("db error");
  }

  // Dedupe por dispositivo: o mesmo celular pode ter assinaturas em origens
  // diferentes (navegador + APK/TWA), o que fazia chegar 2 notificações.
  // Mantemos apenas a assinatura mais recente por user_agent.
  const vistos = new Set<string>();
  const subs = (allSubs ?? []).filter((s: any) => {
    const chave = (s.user_agent || s.id) as string;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });


  if (!subs || subs.length === 0) {
    if (input.tag) {
      try {
        await supabaseAdmin
          .from("push_admin_logs" as any)
          .update({
            sent: 0,
            http_status: null,
            error: "Nenhum dispositivo com push ativo para este entregador",
            status: "sem_dispositivo",
          })
          .eq("tag", input.tag)
          .eq("user_id", input.user_id);
      } catch (e) {
        console.error("[send-push] log sem dispositivo failed", e);
      }
    }
    return { sent: 0, subs: 0 };
  }

  const payloadStr = JSON.stringify({
    title: input.title,
    body: input.body || "",
    url: input.url || "/entregador/disponiveis",
    image: input.image || undefined,
    tag: input.tag,
  });

  console.log(
    "[send-push] enviando",
    JSON.stringify({
      user_id: input.user_id,
      title: input.title,
      tag: input.tag,
      subs: subs.length,
    }),
  );

  let sent = 0;
  let lastStatus: number | null = null;
  let lastError: string | null = null;

  await Promise.all(
    subs.map(async (s) => {
      try {
        let res = await sendWebPush({
          endpoint: s.endpoint,
          p256dh: s.p256dh,
          auth: s.auth,
          payload: payloadStr,
          vapidPublic,
          vapidPrivate,
          vapidSubject,
        });
        if (!(res.status >= 200 && res.status < 300) && res.status !== 404 && res.status !== 410) {
          const errText = await res.text().catch(() => "");
          console.error("[send-push] with payload failed", res.status, errText, "— retrying without payload");
          lastError = `payload_fail ${res.status} ${errText}`;
          res = await sendWebPush({
            endpoint: s.endpoint,
            p256dh: s.p256dh,
            auth: s.auth,
            payload: undefined,
            vapidPublic,
            vapidPrivate,
            vapidSubject,
          });
        }
        lastStatus = res.status;
        if (res.status === 404 || res.status === 410) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
        } else if (res.status >= 200 && res.status < 300) {
          sent++;
        } else {
          const txt = await res.text().catch(() => "");
          lastError = `${res.status} ${txt}`;
          console.error("[send-push] push failed", res.status, txt);
        }
      } catch (e: any) {
        lastError = e?.message || String(e);
        console.error(
          "[send-push] error",
          e?.message || e,
          "endpoint_host=",
          (() => {
            try {
              return new URL(s.endpoint).host;
            } catch {
              return "?";
            }
          })(),
        );
      }
    }),
  );

  console.log("[send-push] resultado", JSON.stringify({ user_id: input.user_id, sent, subs: subs.length }));

  if (input.tag) {
    try {
      await supabaseAdmin
        .from("push_admin_logs" as any)
        .update({
          sent,
          http_status: lastStatus,
          error: sent > 0 ? null : lastError,
          status: sent > 0 ? "enviado" : "falhou",
        })
        .eq("tag", input.tag)
        .eq("user_id", input.user_id);
    } catch (e) {
      console.error("[send-push] log update failed", e);
    }
  }

  return { sent, subs: subs.length };
}

/** Dispara pushes em lotes concorrentes e devolve o total entregue. */
export async function enviarPushEmLote(
  userIds: string[],
  base: Omit<PushInput, "user_id">,
  concorrencia = 10,
): Promise<number> {
  let sent = 0;
  for (let i = 0; i < userIds.length; i += concorrencia) {
    const batch = userIds.slice(i, i + concorrencia);
    const results = await Promise.all(
      batch.map(async (uid) => {
        try {
          const r = await enviarPushParaUsuario({ ...base, user_id: uid });
          return r.sent;
        } catch {
          return 0;
        }
      }),
    );
    sent += results.reduce((a, b) => a + b, 0);
  }
  return sent;
}

// =============== Web Push helpers (VAPID + payload encryption) ===============

const b64urlEncode = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const b64urlDecode = (s: string) => {
  const cleaned = String(s).trim().replace(/[^A-Za-z0-9_\-+/=]/g, "").replace(/=+$/, "");
  const pad = "=".repeat((4 - (cleaned.length % 4)) % 4);
  const b64 = (cleaned + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

function rawPubToJwk(raw: Uint8Array): JsonWebKey {
  if (raw.length !== 65 || raw[0] !== 0x04) throw new Error("bad pubkey");
  return {
    kty: "EC",
    crv: "P-256",
    x: b64urlEncode(raw.slice(1, 33)),
    y: b64urlEncode(raw.slice(33, 65)),
    ext: true,
  };
}

async function importVapidKey(privateB64Url: string, publicB64Url: string) {
  const d = b64urlEncode(b64urlDecode(privateB64Url));
  const pubRaw = b64urlDecode(publicB64Url);
  const jwk: JsonWebKey = { ...rawPubToJwk(pubRaw), d, key_ops: ["sign"] };
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

async function signJwtES256(privateKey: CryptoKey, header: object, payload: object) {
  const enc = new TextEncoder();
  const h = b64urlEncode(enc.encode(JSON.stringify(header)));
  const p = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const signingInput = `${h}.${p}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    enc.encode(signingInput) as BufferSource,
  );
  return `${signingInput}.${b64urlEncode(sig)}`;
}

async function buildVapidHeader(audience: string, subject: string, pubKey: string, privKey: string) {
  const key = await importVapidKey(privKey, pubKey);
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const jwt = await signJwtES256(key, { typ: "JWT", alg: "ES256" }, { aud: audience, exp, sub: subject });
  return { authorization: `vapid t=${jwt}, k=${pubKey}` };
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
  const key = await crypto.subtle.importKey("raw", ikm as BufferSource, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt as BufferSource, info: info as BufferSource },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

function concat(...arrs: Uint8Array[]) {
  const total = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

async function encryptPayloadAes128Gcm(payload: string, ua_p256dh: string, ua_auth: string) {
  const enc = new TextEncoder();
  const plaintext = concat(enc.encode(payload), new Uint8Array([0x02]));

  const uaPublicRaw = b64urlDecode(ua_p256dh);
  const authSecret = b64urlDecode(ua_auth);

  const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const ephemeralPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey));

  const uaPub = await crypto.subtle.importKey(
    "jwk",
    rawPubToJwk(uaPublicRaw),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  const ecdhSecretBits = await crypto.subtle.deriveBits({ name: "ECDH", public: uaPub }, ephemeral.privateKey, 256);
  const ecdhSecret = new Uint8Array(ecdhSecretBits);

  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublicRaw, ephemeralPubRaw);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, concat(enc.encode("Content-Encoding: aes128gcm\0")), 16);
  const nonce = await hkdf(salt, ikm, concat(enc.encode("Content-Encoding: nonce\0")), 12);

  const cekKey = await crypto.subtle.importKey("raw", cek as BufferSource, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, cekKey, plaintext as BufferSource),
  );

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const header = concat(salt, rs, new Uint8Array([ephemeralPubRaw.length]), ephemeralPubRaw);
  return concat(header, ciphertext);
}

async function sendWebPush(opts: {
  endpoint: string;
  p256dh: string;
  auth: string;
  payload?: string;
  vapidPublic: string;
  vapidPrivate: string;
  vapidSubject: string;
}) {
  const u = new URL(opts.endpoint);
  const audience = `${u.protocol}//${u.host}`;
  const { authorization } = await buildVapidHeader(audience, opts.vapidSubject, opts.vapidPublic, opts.vapidPrivate);
  const body = opts.payload ? await encryptPayloadAes128Gcm(opts.payload, opts.p256dh, opts.auth) : undefined;
  const headers: Record<string, string> = { authorization, ttl: "60" };
  if (body) {
    headers["content-encoding"] = "aes128gcm";
    headers["content-type"] = "application/octet-stream";
  }
  return fetch(opts.endpoint, { method: "POST", headers, body: body as BodyInit });
}
