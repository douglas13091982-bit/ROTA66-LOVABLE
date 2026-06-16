import { describe, it, expect } from "vitest";
import { isValidCpf, isValidCnpj, isValidCep, isValidPhoneBr } from "./br-documents";

describe("isValidCpf", () => {
  it("aceita CPFs válidos conhecidos", () => {
    expect(isValidCpf("11144477735")).toBe(true);
    expect(isValidCpf("529.982.247-25")).toBe(true);
  });

  it("rejeita comprimento errado", () => {
    expect(isValidCpf("1234567890")).toBe(false);
    expect(isValidCpf("")).toBe(false);
    expect(isValidCpf(null)).toBe(false);
  });

  it("rejeita CPFs com todos os dígitos iguais", () => {
    expect(isValidCpf("00000000000")).toBe(false);
    expect(isValidCpf("11111111111")).toBe(false);
    expect(isValidCpf("99999999999")).toBe(false);
  });

  it("rejeita dígitos verificadores errados", () => {
    expect(isValidCpf("11144477734")).toBe(false);
  });
});

describe("isValidCnpj", () => {
  it("aceita CNPJ válido conhecido", () => {
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
  });

  it("rejeita comprimento errado", () => {
    expect(isValidCnpj("123")).toBe(false);
    expect(isValidCnpj(null)).toBe(false);
  });

  it("rejeita CNPJs com todos os dígitos iguais", () => {
    expect(isValidCnpj("00000000000000")).toBe(false);
  });

  it("rejeita dígitos verificadores errados", () => {
    expect(isValidCnpj("11222333000180")).toBe(false);
  });
});

describe("isValidCep", () => {
  it("aceita 8 dígitos com ou sem máscara", () => {
    expect(isValidCep("89200000")).toBe(true);
    expect(isValidCep("89200-000")).toBe(true);
  });

  it("rejeita comprimento errado", () => {
    expect(isValidCep("123")).toBe(false);
    expect(isValidCep(null)).toBe(false);
  });
});

describe("isValidPhoneBr", () => {
  it("aceita 10 ou 11 dígitos", () => {
    expect(isValidPhoneBr("4733331234")).toBe(true);
    expect(isValidPhoneBr("(47) 99999-1234")).toBe(true);
  });

  it("rejeita comprimento fora desse range", () => {
    expect(isValidPhoneBr("123")).toBe(false);
    expect(isValidPhoneBr("123456789012")).toBe(false);
    expect(isValidPhoneBr(null)).toBe(false);
  });
});
