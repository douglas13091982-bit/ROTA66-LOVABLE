export type AreaKey = string;

export const AREAS: { key: AreaKey; label: string }[] = [
  { key: "lojas", label: "Lojas" },
  { key: "entregadores", label: "Entregadores" },
  { key: "financeiro", label: "Financeiro" },
  { key: "creditos", label: "Créditos do entregador" },
  { key: "tarifas", label: "Tarifas" },
  { key: "roteirizacao", label: "Roteirização" },
  { key: "branding", label: "Identidade visual" },
  { key: "anuncios", label: "Anúncios" },
  { key: "notificacao_som", label: "Som de alerta" },
  { key: "pedidos", label: "Pedidos" },
  { key: "app_apk", label: "App APK" },
];

export type AdminRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  is_super: boolean;
  permissoes: Record<string, { can_write: boolean }>;
};

export type PermState = Record<string, { enabled: boolean; can_write: boolean }>;

export function emptyPerms(): PermState {
  return Object.fromEntries(AREAS.map((a) => [a.key, { enabled: false, can_write: false }]));
}

export function permsFromAdmin(admin: AdminRow): PermState {
  const m: PermState = {};
  for (const a of AREAS) {
    const p = admin.permissoes?.[a.key];
    m[a.key] = { enabled: !!p, can_write: !!p?.can_write };
  }
  return m;
}

export function permsToPayload(perms: PermState): Record<string, { can_write: boolean }> {
  const out: Record<string, { can_write: boolean }> = {};
  for (const [k, v] of Object.entries(perms)) {
    if (v.enabled) out[k] = { can_write: v.can_write };
  }
  return out;
}
