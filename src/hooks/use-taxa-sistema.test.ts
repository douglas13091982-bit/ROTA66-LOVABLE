import { describe, it, expect } from "vitest";
import { liquidoEntregador } from "./use-taxa-sistema";

/**
 * Novo contrato: o entregador recebe a `taxa_entrega` integral.
 * A taxa do plano da loja é cobrada do cliente (somada à taxa de entrega)
 * e a loja repassa esse valor ao sistema depois — nada é descontado do
 * ganho do entregador.
 */
describe("liquidoEntregador (entregador recebe taxa cheia)", () => {
  it("ignora a taxa do plano e devolve a taxa cheia", () => {
    expect(liquidoEntregador(10)).toBe(10);
    expect(liquidoEntregador(10, 2, false)).toBe(10);
    expect(liquidoEntregador(10, 1, false)).toBe(10);
    expect(liquidoEntregador(10, 5, true)).toBe(10);
  });

  it("regressão: NUNCA mais desconta nada do entregador", () => {
    // Antes: 10 - 2 = 8. Agora: 10 cheio.
    expect(liquidoEntregador(10, 2, false)).not.toBe(8);
    expect(liquidoEntregador(10, 2, false)).toBe(10);
  });

  it("retorna 0 para taxa ausente, zero ou negativa", () => {
    expect(liquidoEntregador(0)).toBe(0);
    expect(liquidoEntregador(-5)).toBe(0);
    expect(liquidoEntregador(null)).toBe(0);
    expect(liquidoEntregador(undefined)).toBe(0);
  });

  it("coage strings numéricas", () => {
    expect(liquidoEntregador("10.50")).toBe(10.5);
    expect(liquidoEntregador("abc")).toBe(0);
  });
});
