export type RoteirizacaoForm = {
  max_detour_minutes: string;
  max_detour_km: string;
  max_paradas_por_rota: string;
  max_paradas_por_rota_carro: string;
  entregador_online_ttl_min: string;
  raio_agrupamento_preparo_km: string;
  catalogo_horizontal_min_produtos: string;
  catalogo_horizontal_min_categorias: string;
};

export const INITIAL_FORM: RoteirizacaoForm = {
  max_detour_minutes: "15",
  max_detour_km: "3",
  max_paradas_por_rota: "6",
  max_paradas_por_rota_carro: "12",
  entregador_online_ttl_min: "10",
  raio_agrupamento_preparo_km: "1.5",
  catalogo_horizontal_min_produtos: "50",
  catalogo_horizontal_min_categorias: "5",
};

export function fromRow(data: any): RoteirizacaoForm {
  return {
    max_detour_minutes: String(Math.round((data.max_detour_seconds ?? 900) / 60)),
    max_detour_km: String(((data.max_detour_meters ?? 3000) / 1000).toFixed(1)),
    max_paradas_por_rota: String(data.max_paradas_por_rota ?? 6),
    max_paradas_por_rota_carro: String(data.max_paradas_por_rota_carro ?? 12),
    entregador_online_ttl_min: String(data.entregador_online_ttl_min ?? 10),
    raio_agrupamento_preparo_km: String(((data.raio_agrupamento_preparo_meters ?? 1500) / 1000).toFixed(1)),
    catalogo_horizontal_min_produtos: String(data.catalogo_horizontal_min_produtos ?? 50),
    catalogo_horizontal_min_categorias: String(data.catalogo_horizontal_min_categorias ?? 5),
  };
}

export type ValidationResult =
  | { ok: true; payload: Record<string, number> }
  | { ok: false; error: string };

export function validateAndBuild(form: RoteirizacaoForm): ValidationResult {
  const minutes = Number(form.max_detour_minutes);
  const km = Number(form.max_detour_km);
  const paradas = Number(form.max_paradas_por_rota);
  const paradasCarro = Number(form.max_paradas_por_rota_carro);
  const ttl = Number(form.entregador_online_ttl_min);
  const raioKm = Number(form.raio_agrupamento_preparo_km);
  const catMinProd = Number(form.catalogo_horizontal_min_produtos);
  const catMinCat = Number(form.catalogo_horizontal_min_categorias);

  if (![minutes, km, paradas, paradasCarro, ttl, raioKm].every((n) => Number.isFinite(n) && n > 0)) {
    return { ok: false, error: "Todos os valores devem ser positivos" };
  }
  if (![catMinProd, catMinCat].every((n) => Number.isFinite(n) && n >= 1)) {
    return { ok: false, error: "Os limites do catálogo devem ser números inteiros ≥ 1" };
  }
  if (paradas > 20 || paradasCarro > 40) {
    return { ok: false, error: "Máximo de 20 paradas (moto) / 40 (carro) por rota" };
  }

  return {
    ok: true,
    payload: {
      max_detour_seconds: Math.round(minutes * 60),
      max_detour_meters: Math.round(km * 1000),
      max_paradas_por_rota: paradas,
      max_paradas_por_rota_carro: paradasCarro,
      entregador_online_ttl_min: ttl,
      raio_agrupamento_preparo_meters: Math.round(raioKm * 1000),
      catalogo_horizontal_min_produtos: Math.round(catMinProd),
      catalogo_horizontal_min_categorias: Math.round(catMinCat),
    },
  };
}
