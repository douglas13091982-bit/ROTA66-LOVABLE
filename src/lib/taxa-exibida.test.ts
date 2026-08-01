import { describe, it, expect } from "vitest";
import { criarCalculadorTaxaExibida } from "./taxa-exibida";
import { liquidoEntregador } from "@/hooks/use-taxa-sistema";
import type { PedidoDisponivel } from "@/types/pedido";

/**
 * Testes de regressão para o bug de SUBTRAÇÃO DUPLA no card do entregador.
 *
 * Bug histórico: `taxaParaExibir(p)` já retornava o líquido do entregador,
 * mas o `PedidoListItem` re-envolvia o resultado em `liquidoEntregador`,
 * subtraindo a taxa por pedido duas vezes (ex.: 11 → 9,50 → 8,00).
 *
 * Contrato validado aqui:
 *   1. `taxaParaExibir(p)` retorna EXATAMENTE `liquidoEntregador(...)`.
 *   2. Somar `taxaParaExibir` sobre um grupo NUNCA aplica um segundo
 *      desconto — deve bater com a soma dos líquidos individuais.
 *   3. Re-envolver o resultado em `liquidoEntregador` (bug antigo) produz
 *      um valor MENOR que o correto — teste confirma o formato do bug
 *      para evitar reintrodução silenciosa.
 */

function pedido(overrides: Partial<PedidoDisponivel> = {}): PedidoDisponivel {
  return {
    id: "p1",
    numero: 209,
    loja_id: "l1",
    status: "pronto",
    entregador_id: null,
    rota_id: null,
    rota_ordem: null,
    created_at: new Date().toISOString(),
    endereco_coleta: null,
    endereco_entrega: null,
    endereco_coleta_lat: null,
    endereco_coleta_lng: null,
    endereco_entrega_lat: null,
    endereco_entrega_lng: null,
    taxa_entrega: 11,
    bonus_entregador: 0,
    codigo_coleta: null,
    forma_pagamento: "dinheiro",
    loja_taxa_por_pedido: 1.5,
    loja_plano_mensal_ativo: false,
    _externo: true,
    ...overrides,
  };
}

describe("taxaParaExibir × liquidoEntregador — sem subtração dupla", () => {
  const taxaParaExibir = criarCalculadorTaxaExibida([]);

  it("retorna exatamente o líquido do entregador para dinheiro", () => {
    const p = pedido({ taxa_entrega: 11, loja_taxa_por_pedido: 1.5 });
    expect(taxaParaExibir(p)).toBe(9.5);
    expect(taxaParaExibir(p)).toBe(
      liquidoEntregador(11, 1.5, false, "dinheiro"),
    );
  });

  it("retorna exatamente o líquido do entregador para pix", () => {
    const p = pedido({
      taxa_entrega: 9.5,
      loja_taxa_por_pedido: 1.5,
      forma_pagamento: "pix",
    });
    expect(taxaParaExibir(p)).toBe(8);
    expect(taxaParaExibir(p)).toBe(
      liquidoEntregador(9.5, 1.5, false, "pix"),
    );
  });

  it("dobra o frete quando pagamento é cartão (regra da maquininha)", () => {
    const p = pedido({
      taxa_entrega: 11,
      loja_taxa_por_pedido: 1.5,
      forma_pagamento: "cartao",
    });
    // frete líquido = 11 - 1.5 = 9.5 → dobra = 19
    expect(taxaParaExibir(p)).toBe(19);
    expect(taxaParaExibir(p)).toBe(
      liquidoEntregador(11, 1.5, false, "cartao"),
    );
  });

  it("REGRESSÃO: somar taxaParaExibir num grupo não aplica desconto extra", () => {
    // Simula o cálculo do PedidoListItem: soma dos itens do grupo.
    const grupo = [
      pedido({ id: "a", taxa_entrega: 11, loja_taxa_por_pedido: 1.5 }),
      pedido({ id: "b", taxa_entrega: 9.5, loja_taxa_por_pedido: 1.5 }),
    ];
    const total = grupo.reduce((s, p) => s + taxaParaExibir(p), 0);
    // 9.5 + 8 = 17.5 (sem subtração dupla)
    expect(total).toBe(17.5);
  });

  it("REGRESSÃO: re-envolver taxaParaExibir em liquidoEntregador produziria valor MENOR (bug antigo)", () => {
    // Este teste documenta o bug histórico. Se algum consumidor voltar
    // a chamar liquidoEntregador(taxaParaExibir(p), taxaPlano) o valor
    // cai de 9,50 para 8,00 — que é o bug que reportamos.
    const p = pedido({ taxa_entrega: 11, loja_taxa_por_pedido: 1.5 });
    const correto = taxaParaExibir(p);
    const comBugDeSubtracaoDupla = liquidoEntregador(
      correto,
      1.5,
      false,
      "dinheiro",
    );
    expect(correto).toBe(9.5);
    expect(comBugDeSubtracaoDupla).toBe(8);
    expect(comBugDeSubtracaoDupla).toBeLessThan(correto);
  });

  it("plano mensal ativo NÃO deve zerar o desconto (regra fixa do projeto)", () => {
    // Core memory: taxa por pedido é SEMPRE descontada do líquido do
    // entregador, mesmo com plano mensal ativo. taxaParaExibir DEVE
    // seguir a mesma regra que liquidoEntregador — sem divergência.
    const p = pedido({
      taxa_entrega: 11,
      loja_taxa_por_pedido: 1.5,
      loja_plano_mensal_ativo: true,
    });
    expect(taxaParaExibir(p)).toBe(
      liquidoEntregador(11, 1.5, true, "dinheiro"),
    );
  });

  it("aceita taxa_entrega ausente e cai no fallback sem estourar", () => {
    const p = pedido({
      taxa_entrega: null,
      loja_taxa_por_pedido: 1.5,
    });
    const valor = taxaParaExibir(p);
    expect(Number.isFinite(valor)).toBe(true);
    expect(valor).toBeGreaterThanOrEqual(0);
  });
});
