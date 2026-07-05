import { describe, it, expect } from "vitest";
import { liquidoEntregador } from "./use-taxa-sistema";

/**
 * Contrato: o cliente paga o total (frete + taxa por pedido do plano).
 * O entregador recebe apenas a taxa global (frete), ou seja,
 * `taxa_entrega - loja_taxa_por_pedido`. A taxa do plano fica acumulada
 * para a loja repassar ao sistema.
 */
describe("liquidoEntregador (entregador recebe apenas o frete)", () => {
  it("subtrai a taxa do plano da taxa de entrega", () => {
    expect(liquidoEntregador(10, 2)).toBe(8);
    expect(liquidoEntregador(8, 1.5)).toBe(6.5);
    expect(liquidoEntregador(10, 0)).toBe(10);
    expect(liquidoEntregador(10)).toBe(10);
  });

  it("nunca retorna valor negativo", () => {
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
