import { describe, it, expect } from "vitest";
import { calcularTarifaPorFaixa, encontrarFaixa } from "./tarifa-calculator";
import type { TarifaFaixa } from "@/types/pedido";

const f = (
  faixa_km_min: number,
  faixa_km_max: number,
  valor: number,
  extras: Partial<TarifaFaixa> = {},
): TarifaFaixa =>
  ({
    faixa_km_min,
    faixa_km_max,
    valor,
    valor_minimo: 0,
    valor_por_km: 0,
    ...extras,
  }) as TarifaFaixa;

describe("calcularTarifaPorFaixa", () => {
  const faixas: TarifaFaixa[] = [
    f(0, 3, 7),
    f(3, 6, 10),
    f(6, 10, 14, { valor_por_km: 1.5, valor_minimo: 16 }),
  ];

  it("retorna null quando km é null", () => {
    expect(calcularTarifaPorFaixa(null, faixas)).toBeNull();
  });

  it("retorna null quando km é negativo", () => {
    expect(calcularTarifaPorFaixa(-1, faixas)).toBeNull();
  });

  it("retorna null quando não há faixas", () => {
    expect(calcularTarifaPorFaixa(5, [])).toBeNull();
    expect(calcularTarifaPorFaixa(5, null)).toBeNull();
    expect(calcularTarifaPorFaixa(5, undefined)).toBeNull();
  });

  it("retorna o valor da faixa quando km cai exatamente dentro", () => {
    expect(calcularTarifaPorFaixa(2, faixas)).toBe(7);
    expect(calcularTarifaPorFaixa(5, faixas)).toBe(10);
  });

  it("usa a primeira faixa quando km bate no limite inferior compartilhado", () => {
    // 3 é fim da faixa 0-3 e início da 3-6 → find encontra a primeira
    expect(calcularTarifaPorFaixa(3, faixas)).toBe(7);
  });

  it("trata km = 0 como pertencente à primeira faixa", () => {
    expect(calcularTarifaPorFaixa(0, faixas)).toBe(7);
  });

  it("respeita valor_minimo dentro da faixa", () => {
    expect(calcularTarifaPorFaixa(7, faixas)).toBe(16);
  });

  it("soma excedente × valor_por_km quando km > maior faixa", () => {
    // km=12, maior faixa 6-10 (valor 14, R$1.5/km), excedente = 2 → 14 + 3 = 17
    expect(calcularTarifaPorFaixa(12, faixas)).toBe(17);
  });

  it("aplica valor_minimo mesmo no excedente", () => {
    const cobertas = [f(0, 5, 5, { valor_minimo: 50 })];
    expect(calcularTarifaPorFaixa(20, cobertas)).toBe(50);
  });

  it("converte campos numéricos string-coerced", () => {
    const stringy = [
      { faixa_km_min: "0", faixa_km_max: "3", valor: "7" } as unknown as TarifaFaixa,
    ];
    expect(calcularTarifaPorFaixa(2, stringy)).toBe(7);
  });
});

describe("encontrarFaixa", () => {
  const faixas: TarifaFaixa[] = [f(0, 3, 7), f(3, 6, 10), f(6, 10, 14)];

  it("retorna null quando não há faixas", () => {
    expect(encontrarFaixa(5, [])).toBeNull();
  });

  it("encontra a faixa em que km cai", () => {
    expect(encontrarFaixa(4, faixas)).toBe(faixas[1]);
  });

  it("retorna a maior faixa quando km excede o teto", () => {
    expect(encontrarFaixa(50, faixas)).toBe(faixas[2]);
  });
});
