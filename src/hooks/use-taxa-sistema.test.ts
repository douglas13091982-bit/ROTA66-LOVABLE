import { describe, it, expect, vi } from "vitest";

// O arquivo importa o cliente Supabase. Mockamos antes do import para evitar
// inicialização real no ambiente de teste.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn() },
}));

import { liquidoEntregador } from "./use-taxa-sistema";

describe("liquidoEntregador", () => {
  it("retorna valor cheio quando a loja tem plano mensal ativo", () => {
    expect(liquidoEntregador(10, 2, true)).toBe(10);
  });

  it("desconta a taxa do sistema quando a loja não tem plano", () => {
    expect(liquidoEntregador(10, 2, false)).toBe(8);
    expect(liquidoEntregador(10, 2, null)).toBe(8);
    expect(liquidoEntregador(10, 2, undefined)).toBe(8);
  });

  it("retorna 0 quando taxa de entrega é zero", () => {
    expect(liquidoEntregador(0, 2, false)).toBe(0);
    expect(liquidoEntregador(0, 0, true)).toBe(0);
  });

  it("nunca retorna negativo quando o desconto excede a taxa", () => {
    expect(liquidoEntregador(2, 5, false)).toBe(0);
  });

  it("coage entrada string em número", () => {
    expect(liquidoEntregador("10.50", 0.5, false)).toBe(10);
    expect(liquidoEntregador("abc", 2, false)).toBe(0);
  });

  it("trata null/undefined como zero", () => {
    expect(liquidoEntregador(null, 2, false)).toBe(0);
    expect(liquidoEntregador(undefined, 2, true)).toBe(0);
  });
});
