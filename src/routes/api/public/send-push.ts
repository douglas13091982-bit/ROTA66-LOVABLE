import { createFileRoute } from "@tanstack/react-router";

// Endpoint público chamado pelo trigger do banco (pg_net) para enviar
// notificações Web Push aos entregadores. Autentica via header `x-push-secret`.

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
        // timing-safe compare
        const a = new TextEncoder().encode(secretHeader);
        const b = new TextEncoder().encode(expected);
        let diff = a.length ^ b.length;
        for (let i = 0; i < Math.min(a.length, b.length); i++) diff |= a[i] ^ b[i];
        if (diff !== 0) {
          return new Response("unauthorized", { status: 401 });
        }

        let payload: { user_id?: string; title?: string; body?: string; url?: string };
        try {
          payload = await request.json();
        } catch {
          return new Response("invalid json", { status: 400 });
        }
        if (!payload.user_id || !payload.title) {
          return new Response("missing fields", { status: 400 });
        }

        const vapidPublic = process.env.VAPID_PUBLIC_KEY!;
        const vapidPrivate = process.env.VAPID_PRIVATE_KEY!;
        const vapidSubject = process.env.VAPID_SUBJECT || "mailto:contato@rota66.app";
        const oneSignalAppId = "e9e73215-0750-464d-859e-674e97f00a68";
        const oneSignalRestKey = process.env.ONESIGNAL_REST_API_KEY;

        // Dispara OneSignal em paralelo (APK Android encapsulado).
        // Não bloqueia o resultado — Web Push continua sendo a métrica principal.
        const oneSignalPromise = (async () => {
          if (!oneSignalRestKey) return { onesignal: "not configured" };
          try {
            const res = await fetch("https://api.onesignal.com/notifications", {
              method: "POST",
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                Authorization: `Key ${oneSignalRestKey}`,
              },
              body: JSON.stringify({
                app_id: oneSignalAppId,
                include_aliases: { external_id: [payload.user_id] },
                target_channel: "push",
                headings: { en: payload.title, pt: payload.title },
                contents: { en: payload.body || "", pt: payload.body || "" },
                url: payload.url ? `https://rotas66.lovable.app${payload.url}` : undefined,
                data: { url: payload.url || "/entregador/ativos" },
                android_channel_id: undefined,
                priority: 10,
              }),
            });
            const text = await res.text();
            if (!res.ok) {
              console.error("[send-push] onesignal failed", res.status, text);
              return { onesignal: `error ${res.status}` };
            }
            return { onesignal: "sent" };
          } catch (e) {
            console.error("[send-push] onesignal error", e);
            return { onesignal: "exception" };
          }
        })();

        if (!vapidPrivate || !vapidPublic) {
          console.error("[send-push] VAPID keys not configured");
          const os = await oneSignalPromise;
          return Response.json({ sent: 0, ...os });
        }

        const { data: subs, error } = await supabaseAdmin
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", payload.user_id);
        if (error) {
          console.error("[send-push] db error", error);
          return new Response("db error", { status: 500 });
        }
        if (!subs || subs.length === 0) {
          const os = await oneSignalPromise;
          return Response.json({ sent: 0, ...os });
        }

        const message = JSON.stringify({
          title: payload.title,
          body: payload.body || "",
          url: payload.url || "/entregador/ativos",
        });

        let sent = 0;
        await Promise.all(
          subs.map(async (s) => {
            try {
              const res = await sendWebPush({
                endpoint: s.endpoint,
                p256dh: s.p256dh,
                auth: s.auth,
                payload: message,
                vapidPublic,
                vapidPrivate,
                vapidSubject,
              });
              if (res.status === 404 || res.status === 410) {
                await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
              } else if (res.status >= 200 && res.status < 300) {
                sent++;
              } else {
                console.error("[send-push] push failed", res.status, await res.text());
              }
            } catch (e) {
              console.error("[send-push] error", e);
            }
          })
        );

        const os = await oneSignalPromise;
        return Response.json({ sent, ...os });
      },
    },
  },
});

// =============== Web Push helpers (VAPID + payload encryption) ===============

const b64urlEncode = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const b64urlDecode = (s: string) => {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

// JWK from raw uncompressed P-256 public key (65 bytes: 0x04 || X(32) || Y(32))
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

// Convert ECDSA WebCrypto signature (raw r||s, 64 bytes) — already correct format for JWT ES256
async function signJwtES256(privateKey: CryptoKey, header: object, payload: object) {
  const enc = new TextEncoder();
  const h = b64urlEncode(enc.encode(JSON.stringify(header)));
  const p = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const signingInput = `${h}.${p}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    enc.encode(signingInput) as BufferSource
  );
  return `${signingInput}.${b64urlEncode(sig)}`;
}

async function buildVapidHeader(audience: string, subject: string, pubKey: string, privKey: string) {
  const key = await importVapidKey(privKey, pubKey);
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  const jwt = await signJwtES256(key, { typ: "JWT", alg: "ES256" }, { aud: audience, exp, sub: subject });
  return { authorization: `vapid t=${jwt}, k=${pubKey}` };
}

// HKDF helper using Web Crypto
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
  const key = await crypto.subtle.importKey("raw", ikm as BufferSource, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt as BufferSource, info: info as BufferSource },
    key,
    length * 8
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

// RFC 8291 aes128gcm encryption
async function encryptPayloadAes128Gcm(payload: string, ua_p256dh: string, ua_auth: string) {
  const enc = new TextEncoder();
  const plaintext = concat(enc.encode(payload), new Uint8Array([0x02])); // padding delim

  const uaPublicRaw = b64urlDecode(ua_p256dh);
  const authSecret = b64urlDecode(ua_auth);

  // generate ephemeral ECDH key
  const ephemeral = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const ephemeralPubRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", ephemeral.publicKey)
  );

  // import UA public key
  const uaPub = await crypto.subtle.importKey(
    "jwk",
    rawPubToJwk(uaPublicRaw),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const ecdhSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: uaPub },
    ephemeral.privateKey,
    256
  );
  const ecdhSecret = new Uint8Array(ecdhSecretBits);

  // PRK_key = HKDF(authSecret, ecdhSecret, "WebPush: info\0" || ua_pub || as_pub, 32)
  const keyInfo = concat(
    enc.encode("WebPush: info\0"),
    uaPublicRaw,
    ephemeralPubRaw
  );
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);

  // Generate random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // CEK
  const cek = await hkdf(salt, ikm, concat(enc.encode("Content-Encoding: aes128gcm\0")), 16);
  // Nonce
  const nonce = await hkdf(salt, ikm, concat(enc.encode("Content-Encoding: nonce\0")), 12);

  const cekKey = await crypto.subtle.importKey("raw", cek as BufferSource, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, cekKey, plaintext as BufferSource)
  );

  // Build aes128gcm header: salt(16) || rs(4 BE) || idlen(1) || keyid (as_pub raw, 65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const header = concat(salt, rs, new Uint8Array([ephemeralPubRaw.length]), ephemeralPubRaw);
  return concat(header, ciphertext);
}

async function sendWebPush(opts: {
  endpoint: string;
  p256dh: string;
  auth: string;
  payload: string;
  vapidPublic: string;
  vapidPrivate: string;
  vapidSubject: string;
}) {
  const u = new URL(opts.endpoint);
  const audience = `${u.protocol}//${u.host}`;
  const { authorization } = await buildVapidHeader(
    audience,
    opts.vapidSubject,
    opts.vapidPublic,
    opts.vapidPrivate
  );
  const body = await encryptPayloadAes128Gcm(opts.payload, opts.p256dh, opts.auth);
  return fetch(opts.endpoint, {
    method: "POST",
    headers: {
      authorization,
      "content-encoding": "aes128gcm",
      "content-type": "application/octet-stream",
      ttl: "60",
    },
    body: body as BodyInit,
  });
}
