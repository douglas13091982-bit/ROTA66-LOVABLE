import { describe, it, expect } from "vitest";
import { liquidoEntregador } from "./use-taxa-sistema";

/**
 * Contrato: taxa_entrega (cliente) = frete global + taxa por pedido da loja.
 * O entregador recebe apenas a parcela do frete global, ou seja,
 * taxa_entrega - taxa_por_pedido_aplicada. Quando o plano mensal da loja
 * está ativo, a taxa por pedido é zero e o entregador recebe integralmente.
 */
describe("liquidoEntregador (entregador recebe apenas o frete global)", () => {
  it("desconta a taxa por pedido da loja quando plano não está ativo", () => {
    expect(liquidoEntregador(10, 2)).toBe(8);
    expect(liquidoEntregador(10, 2, false)).toBe(8);
    expect(liquidoEntregador(9.5, 1.5)).toBe(8);
  });

  it("desconta a taxa por pedido mesmo com plano mensal ativo (regra fixa)", () => {
    expect(liquidoEntregador(10, 2, true)).toBe(8);
    expect(liquidoEntregador(8, 5, true)).toBe(3);
  });

  it("retorna zero quando a taxa da loja é maior que a taxa de entrega", () => {
    expect(liquidoEntregador(2, 5)).toBe(0);
    expect(liquidoEntregador(2, 2)).toBe(0);
  });

  it("retorna 0 para taxa ausente, zero ou negativa", () => {
    expect(liquidoEntregador(0)).toBe(0);
    expect(liquidoEntregador(-5)).toBe(0);
    expect(liquidoEntregador(null)).toBe(0);
    expect(liquidoEntregador(undefined)).toBe(0);
  });

  it("coage strings numéricas", () => {
    expect(liquidoEntregador("10.50")).toBe(10.5);
    expect(liquidoEntregador("10.50", "2")).toBe(8.5);
    expect(liquidoEntregador("abc")).toBe(0);
  });
});
