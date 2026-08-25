import { describe, it, expect } from "vitest";
import { formatCurrency, formatCurrencyValue, parseCurrency } from "./currency";
import { formatCurrencyValue } from "@/lib/format";

describe("formatCurrency", () => {
  it('retorna "R$ 0,00" para null/undefined/NaN', () => {
    expect(formatCurrency(null)).toBe("R$ 0,00");
    expect(formatCurrency(undefined)).toBe("R$ 0,00");
    expect(formatCurrency(NaN)).toBe("R$ 0,00");
  });

  it("formata número como BRL com símbolo", () => {
    // Intl pode usar U+00A0 (non-breaking space). Comparamos via regex.
    expect(formatCurrency(1234.5)).toMatch(/^R\$\s1\.234,50$/);
  });

  it("formata zero corretamente", () => {
    expect(formatCurrency(0)).toMatch(/^R\$\s0,00$/);
  });

  it("formata valores negativos", () => {
    expect(formatCurrency(-10)).toMatch(/-?R\$\s?-?10,00/);
  });
});

describe("formatCurrencyValue", () => {
  it("formata sem símbolo R$", () => {
    expect(formatCurrencyValue(1234.5)).toBe("1.234,50");
    expect(formatCurrencyValue(null)).toBe("0,00");
  });
});

describe("parseCurrency", () => {
  it("retorna null para entrada vazia", () => {
    expect(parseCurrency(null)).toBeNull();
    expect(parseCurrency(undefined)).toBeNull();
    expect(parseCurrency("")).toBeNull();
  });

  it("parseia formato BR completo", () => {
    expect(parseCurrency("R$ 1.234,56")).toBe(1234.56);
  });

  it("parseia sem símbolo", () => {
    expect(parseCurrency("1.234,56")).toBe(1234.56);
    expect(parseCurrency("1234,56")).toBe(1234.56);
  });

  it('trata "." como separador de milhar (formato BR), nunca como decimal', () => {
    // "1234.56" → o parser remove pontos antes da vírgula → 123456.
    // Comportamento intencional: input é sempre interpretado em formato BR.
    expect(parseCurrency("1234.56")).toBe(123456);
  });

  it("retorna null para texto não numérico", () => {
    expect(parseCurrency("abc")).toBeNull();
  });

  it("ignora espaços", () => {
    expect(parseCurrency("  10,00  ")).toBe(10);
  });
});
