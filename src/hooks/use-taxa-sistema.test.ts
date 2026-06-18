import { describe, it, expect } from "vitest";
import { liquidoEntregador } from "./use-taxa-sistema";

/**
 * Contrato (pós-remoção da taxa global):
 *   ganho_liquido = plano_mensal_ativo
 *     ? taxa_entrega
 *     : max(0, taxa_entrega - loja_taxa_por_pedido)
 *
 * `loja_taxa_por_pedido` vem do plano contratado pela loja
 * (Básico R$2 · Pro R$1 · Premium R$0). NUNCA usar a antiga
 * taxa global de config_financeiro.
 */
describe("liquidoEntregador (taxa do plano da loja)", () => {
  describe("loja com plano mensal ativo (Premium)", () => {
    it("devolve a taxa cheia, ignorando qualquer desconto", () => {
      expect(liquidoEntregador(10, 0, true)).toBe(10);
      expect(liquidoEntregador(10, 5, true)).toBe(10); // mesmo com fee > 0, plano ativo manda
      expect(liquidoEntregador(15.5, 2, true)).toBeCloseTo(15.5, 2);
    });
  });

  describe("loja sem plano mensal — desconta a taxa do plano", () => {
    it("plano Básico: desconta R$ 2", () => {
      expect(liquidoEntregador(10, 2, false)).toBe(8);
    });
    it("plano Pro: desconta R$ 1", () => {
      expect(liquidoEntregador(10, 1, false)).toBe(9);
    });
    it("sem plano (taxa do plano = 0): devolve a taxa cheia", () => {
      expect(liquidoEntregador(10, 0, false)).toBe(10);
    });
    it("trata plano_mensal_ativo null/undefined como inativo", () => {
      expect(liquidoEntregador(10, 2, null)).toBe(8);
      expect(liquidoEntregador(10, 2, undefined)).toBe(8);
    });
  });

  describe("entradas degeneradas", () => {
    it("retorna 0 quando taxa_entrega <= 0", () => {
      expect(liquidoEntregador(0, 2, false)).toBe(0);
      expect(liquidoEntregador(-5, 2, false)).toBe(0);
      expect(liquidoEntregador(0, 0, true)).toBe(0);
    });
    it("nunca retorna negativo quando o desconto excede a taxa", () => {
      expect(liquidoEntregador(2, 5, false)).toBe(0);
      expect(liquidoEntregador(1, 999, false)).toBe(0);
    });
    it("trata loja_taxa_por_pedido null/undefined/NaN como 0", () => {
      expect(liquidoEntregador(10, null, false)).toBe(10);
      expect(liquidoEntregador(10, undefined, false)).toBe(10);
      expect(liquidoEntregador(10, "abc", false)).toBe(10);
    });
    it("trata taxa_entrega null/undefined como 0", () => {
      expect(liquidoEntregador(null, 2, false)).toBe(0);
      expect(liquidoEntregador(undefined, 2, true)).toBe(0);
    });
    it("coage strings numéricas", () => {
      expect(liquidoEntregador("10.50", "0.5", false)).toBe(10);
      expect(liquidoEntregador("10", "2", false)).toBe(8);
    });
  });

  describe("regressão — não pode usar a taxa global antiga (R$ 3)", () => {
    it("loja Básico (R$2) NUNCA desconta R$3", () => {
      // Se alguém reintroduzir a taxa global hardcoded, este teste quebra
      expect(liquidoEntregador(10, 2, false)).toBe(8); // 10 - 2, não 10 - 3
    });
    it("loja Premium (plano ativo) NUNCA sofre desconto", () => {
      expect(liquidoEntregador(10, 0, true)).toBe(10);
      // Mesmo se loja_taxa_por_pedido viesse 3 por engano, plano ativo blinda
      expect(liquidoEntregador(10, 3, true)).toBe(10);
    });
  });
});

/**
 * Garante que o cálculo exibido ao entregador ANTES de aceitar o pedido
 * usa o campo da loja vindo do pedido (`loja_taxa_por_pedido`), não uma
 * taxa global. Reproduz a expressão usada em `PedidoCardDisponivel.tsx`.
 */
describe("cálculo do card de oferta (antes de aceitar)", () => {
  function liquidoDoCard(pedido: {
    taxa_entrega: number;
    loja_taxa_por_pedido?: number | string | null;
    loja_plano_mensal_ativo?: boolean | null;
  }) {
    const taxaLoja = Number(pedido.loja_taxa_por_pedido ?? 0);
    return liquidoEntregador(
      pedido.taxa_entrega,
      taxaLoja,
      pedido.loja_plano_mensal_ativo,
    );
  }

  it("loja Básico: R$ 10 - R$ 2 = R$ 8", () => {
    expect(
      liquidoDoCard({
        taxa_entrega: 10,
        loja_taxa_por_pedido: 2,
        loja_plano_mensal_ativo: false,
      }),
    ).toBe(8);
  });

  it("loja Pro: R$ 10 - R$ 1 = R$ 9", () => {
    expect(
      liquidoDoCard({
        taxa_entrega: 10,
        loja_taxa_por_pedido: 1,
        loja_plano_mensal_ativo: false,
      }),
    ).toBe(9);
  });

  it("loja Premium (plano ativo): R$ 10 cheio", () => {
    expect(
      liquidoDoCard({
        taxa_entrega: 10,
        loja_taxa_por_pedido: 0,
        loja_plano_mensal_ativo: true,
      }),
    ).toBe(10);
  });

  it("pedido sem loja_taxa_por_pedido (campo ausente) NÃO desconta nada", () => {
    // Defensivo: se a RPC ainda não devolveu o campo, melhor pagar a mais
    // ao entregador do que descontar uma taxa global fantasma.
    expect(
      liquidoDoCard({
        taxa_entrega: 10,
        loja_taxa_por_pedido: null,
        loja_plano_mensal_ativo: false,
      }),
    ).toBe(10);
  });
});
