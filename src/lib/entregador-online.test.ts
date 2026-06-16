import { describe, it, expect, vi } from "vitest";

// Evita inicializar o cliente Supabase em ambiente de teste.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null }) }),
      }),
    }),
  },
}));

import { isEffectivelyOnline } from "./entregador-online";

describe("isEffectivelyOnline", () => {
  const NOW = new Date("2026-01-01T12:00:00Z").getTime();

  it("retorna false quando online é false/null/undefined", () => {
    expect(isEffectivelyOnline(false, new Date(NOW).toISOString(), 10, NOW)).toBe(false);
    expect(isEffectivelyOnline(null, new Date(NOW).toISOString(), 10, NOW)).toBe(false);
    expect(isEffectivelyOnline(undefined, new Date(NOW).toISOString(), 10, NOW)).toBe(false);
  });

  it("retorna false quando updatedAt é null", () => {
    expect(isEffectivelyOnline(true, null, 10, NOW)).toBe(false);
  });

  it("retorna false quando updatedAt é inválido", () => {
    expect(isEffectivelyOnline(true, "não-é-data", 10, NOW)).toBe(false);
  });

  it("retorna true dentro do TTL", () => {
    const cincoMinAtras = new Date(NOW - 5 * 60_000).toISOString();
    expect(isEffectivelyOnline(true, cincoMinAtras, 10, NOW)).toBe(true);
  });

  it("retorna true exatamente no limite do TTL", () => {
    const ttl = 10;
    const limite = new Date(NOW - ttl * 60_000).toISOString();
    expect(isEffectivelyOnline(true, limite, ttl, NOW)).toBe(true);
  });

  it("retorna false 1 ms além do TTL", () => {
    const ttl = 10;
    const fora = new Date(NOW - ttl * 60_000 - 1).toISOString();
    expect(isEffectivelyOnline(true, fora, ttl, NOW)).toBe(false);
  });

  it("usa Date.now() quando 'now' não é informado", () => {
    const agora = new Date().toISOString();
    expect(isEffectivelyOnline(true, agora, 10)).toBe(true);
  });
});
