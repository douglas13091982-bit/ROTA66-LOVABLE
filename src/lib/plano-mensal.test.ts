import { describe, it, expect } from "vitest";
import { temPlanoMensal } from "./plano-mensal";

describe("temPlanoMensal", () => {
  it("false sem loja", () => {
    expect(temPlanoMensal(null)).toBe(false);
    expect(temPlanoMensal(undefined)).toBe(false);
  });

  it("false para loja avulsa (sem plano)", () => {
    expect(temPlanoMensal({ plano_mensal_ativo: false, mensalidade_valor: 0, plano_id: null })).toBe(false);
  });

  it("true quando plano_mensal_ativo", () => {
    expect(temPlanoMensal({ plano_mensal_ativo: true })).toBe(true);
  });

  it("true para plano híbrido: mensalidade > 0 mesmo com plano_mensal_ativo false", () => {
    expect(temPlanoMensal({ plano_mensal_ativo: false, mensalidade_valor: "99.90" })).toBe(true);
  });

  it("true quando existe plano_id vinculado", () => {
    expect(temPlanoMensal({ plano_mensal_ativo: false, mensalidade_valor: 0, plano_id: "abc" })).toBe(true);
  });
});
