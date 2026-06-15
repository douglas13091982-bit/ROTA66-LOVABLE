/**
 * Cálculo de tarifa de entrega por faixa de quilometragem.
 * Função pura — usada tanto no hook do formulário quanto na pré-visualização
 * do entregador externo.
 */

import type { TarifaFaixa } from "@/types/pedido";

type FaixaNormalizada = {
  kmMin: number;
  kmMax: number;
  valor: number;
  valorMinimo: number;
  valorPorKm: number;
};

function normalizar(t: TarifaFaixa): FaixaNormalizada {
  return {
    kmMin: Number(t.faixa_km_min) || 0,
    kmMax: Number(t.faixa_km_max) || 0,
    valor: Number(t.valor) || 0,
    valorMinimo: Number(t.valor_minimo) || 0,
    valorPorKm: Number(t.valor_por_km) || 0,
  };
}

function dentroDaFaixa(km: number, f: FaixaNormalizada): boolean {
  return km >= f.kmMin && km <= f.kmMax;
}

function encontrarMaiorFaixa(faixas: FaixaNormalizada[]): FaixaNormalizada {
  return [...faixas].sort((a, b) => b.kmMax - a.kmMax)[0];
}

/**
 * Retorna o valor da tarifa para a km informada, ou null se não houver faixas.
 * Se km exceder a maior faixa, soma o excedente × valor_por_km.
 */
export function calcularTarifaPorFaixa(
  km: number | null,
  faixas: TarifaFaixa[] | null | undefined,
): number | null {
  if (km == null || km < 0) return null;
  if (!faixas || faixas.length === 0) return null;

  const normalizadas = faixas.map(normalizar);
  const faixaExata = normalizadas.find((f) => dentroDaFaixa(km, f));
  if (faixaExata) {
    return Math.max(faixaExata.valor, faixaExata.valorMinimo);
  }

  const maior = encontrarMaiorFaixa(normalizadas);
  const excedente = Math.max(0, km - maior.kmMax);
  const calc = maior.valor + excedente * maior.valorPorKm;
  return Math.max(calc, maior.valorMinimo);
}

/** Encontra a faixa aplicável a uma km — usada para exibir a descrição. */
export function encontrarFaixa(
  km: number,
  faixas: TarifaFaixa[],
): TarifaFaixa | null {
  if (faixas.length === 0) return null;
  const normalizadas = faixas.map(normalizar);
  const idx = normalizadas.findIndex((f) => dentroDaFaixa(km, f));
  if (idx >= 0) return faixas[idx];
  // Fora das faixas → maior faixa
  let maiorIdx = 0;
  for (let i = 1; i < normalizadas.length; i++) {
    if (normalizadas[i].kmMax > normalizadas[maiorIdx].kmMax) maiorIdx = i;
  }
  return faixas[maiorIdx];
}
