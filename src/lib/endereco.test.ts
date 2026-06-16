import { describe, it, expect } from "vitest";
import { normalizarEndereco, resumirEnderecoEntrega, extrairBairro } from "./endereco";

describe("normalizarEndereco", () => {
  it("retorna string vazia quando entrada é null/undefined", () => {
    expect(normalizarEndereco(null)).toBe("");
    expect(normalizarEndereco(undefined)).toBe("");
  });

  it("colapsa múltiplos espaços e faz trim", () => {
    expect(normalizarEndereco("  Rua   X   123  ")).toBe("Rua X 123");
  });
});

describe("resumirEnderecoEntrega", () => {
  it('retorna "—" para entrada vazia', () => {
    expect(resumirEnderecoEntrega("")).toBe("—");
    expect(resumirEnderecoEntrega(null)).toBe("—");
    expect(resumirEnderecoEntrega(undefined)).toBe("—");
  });

  it("remove CEP no final", () => {
    expect(resumirEnderecoEntrega("Rua A, 10 - Centro, Joinville, 89200-000")).toBe(
      "Rua A, 10 - Centro, Joinville",
    );
  });

  it("remove CEP sem hífen", () => {
    expect(resumirEnderecoEntrega("Rua A, 10, 89200000")).toBe("Rua A, 10");
  });

  it("remove UF no final precedido por hífen", () => {
    expect(resumirEnderecoEntrega("Rua A, 10 - Centro, Joinville - SC")).toBe(
      "Rua A, 10 - Centro, Joinville",
    );
  });

  it("remove UF no final precedido por vírgula", () => {
    expect(resumirEnderecoEntrega("Rua A, 10, Centro, Joinville, SC")).toBe(
      "Rua A, 10, Centro, Joinville",
    );
  });

  it("remove UF no meio", () => {
    expect(resumirEnderecoEntrega("Rua A, 10, Joinville, SC, 89200-000")).toBe(
      "Rua A, 10, Joinville",
    );
  });

  it("mantém endereço sem UF/CEP intacto", () => {
    expect(resumirEnderecoEntrega("Rua A, 10 - Centro")).toBe("Rua A, 10 - Centro");
  });

  it("preserva caracteres especiais (acentos)", () => {
    expect(resumirEnderecoEntrega("Rua Açaí, 1 - São João, Joinville - SC")).toBe(
      "Rua Açaí, 1 - São João, Joinville",
    );
  });
});

describe("extrairBairro", () => {
  it("retorna null para entrada vazia", () => {
    expect(extrairBairro("")).toBeNull();
    expect(extrairBairro(null)).toBeNull();
  });

  it("extrai bairro após hífen no padrão BR", () => {
    expect(extrairBairro("Rua A, 10 - Centro, Joinville - SC")).toBe("Centro");
  });

  it("extrai bairro composto após hífen", () => {
    expect(extrairBairro("Rua A, 10 - São João Batista, Joinville - SC")).toBe(
      "São João Batista",
    );
  });

  it("extrai bairro após número quando não há hífen", () => {
    expect(extrairBairro("Rua A, 10, Centro, Joinville, SC")).toBe("Centro");
  });

  it("rejeita candidato muito curto (< 2 chars)", () => {
    expect(extrairBairro("Rua A, 10 - X, Cidade")).toBeNull();
  });

  it("ignora segmento que começa com dígito", () => {
    // "- 200" começa com dígito → vai cair em extração por número e devolver "Cidade"
    expect(extrairBairro("Rua A, 10 - 200, Cidade")).toBe("Cidade");
  });
});
