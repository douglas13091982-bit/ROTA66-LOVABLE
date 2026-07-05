import { describe, it, expect } from "vitest";
import { liquidoEntregador } from "./use-taxa-sistema";

/**
 * Contrato: o entregador recebe a taxa global (frete) integral.
 * A taxa por pedido do plano é cobrança da loja para o sistema e não pode
 * ser descontada do valor exibido/creditado ao entregador.
 */
describe("liquidoEntregador (entregador recebe apenas o frete)", () => {
  it("não desconta a taxa do plano do valor do entregador", () => {
    expect(liquidoEntregador(8, 2)).toBe(8);
    expect(liquidoEntregador(8, 1.5)).toBe(8);
    expect(liquidoEntregador(10, 0)).toBe(10);
    expect(liquidoEntregador(10)).toBe(10);
  });

  it("mantém a taxa global mesmo quando a taxa da loja é maior", () => {
    expect(liquidoEntregador(2, 5)).toBe(2);
    expect(liquidoEntregador(2, 2)).toBe(2);
  });

  it("retorna 0 para taxa ausente, zero ou negativa", () => {
    expect(liquidoEntregador(0)).toBe(0);
    expect(liquidoEntregador(-5)).toBe(0);
    expect(liquidoEntregador(null)).toBe(0);
    expect(liquidoEntregador(undefined)).toBe(0);
  });

  it("coage strings numéricas", () => {
    expect(liquidoEntregador("10.50")).toBe(10.5);
    expect(liquidoEntregador("10.50", "2")).toBe(10.5);
    expect(liquidoEntregador("abc")).toBe(0);
  });
});
