import { describe, it, expect } from "vitest";
import { onlyDigits, formatCpf, formatCnpj, formatCep, formatPhone } from "./document";

describe("onlyDigits", () => {
  it("retorna string vazia para null/undefined", () => {
    expect(onlyDigits(null)).toBe("");
    expect(onlyDigits(undefined)).toBe("");
  });

  it("remove tudo que não é dígito", () => {
    expect(onlyDigits("(47) 99999-1234")).toBe("47999991234");
    expect(onlyDigits("abc")).toBe("");
  });
});

describe("formatCpf", () => {
  it("formata 11 dígitos", () => {
    expect(formatCpf("12345678901")).toBe("123.456.789-01");
  });

  it("aceita já formatado", () => {
    expect(formatCpf("123.456.789-01")).toBe("123.456.789-01");
  });

  it("retorna os dígitos sem formatar quando incompleto", () => {
    expect(formatCpf("123")).toBe("123");
  });

  it("trunca quando passa de 11 dígitos", () => {
    expect(formatCpf("123456789012345")).toBe("123.456.789-01");
  });

  it("retorna string vazia para null", () => {
    expect(formatCpf(null)).toBe("");
  });
});

describe("formatCnpj", () => {
  it("formata 14 dígitos", () => {
    expect(formatCnpj("12345678000199")).toBe("12.345.678/0001-99");
  });

  it("retorna parcial quando incompleto", () => {
    expect(formatCnpj("123")).toBe("123");
  });
});

describe("formatCep", () => {
  it("formata 8 dígitos", () => {
    expect(formatCep("89200000")).toBe("89200-000");
  });

  it("retorna parcial quando incompleto", () => {
    expect(formatCep("8920")).toBe("8920");
  });
});

describe("formatPhone", () => {
  it("formata celular (11 dígitos)", () => {
    expect(formatPhone("47999991234")).toBe("(47) 99999-1234");
  });

  it("formata fixo (10 dígitos)", () => {
    expect(formatPhone("4733331234")).toBe("(47) 3333-1234");
  });

  it("retorna parcial quando incompleto", () => {
    expect(formatPhone("479")).toBe("479");
  });
});
