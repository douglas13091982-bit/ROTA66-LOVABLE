export type PoolAbertoScope =
  | "somente_vinculados"
  | "somente_externos"
  | "vinculados_e_externos";

export type RoteirizacaoForm = {
  max_detour_minutes: string;
  max_detour_km: string;
  max_paradas_por_rota: string;
  max_paradas_por_rota_carro: string;
  entregador_online_ttl_min: string;
  raio_agrupamento_preparo_km: string;
  raio_maximo_coleta_km: string;
  catalogo_horizontal_min_produtos: string;
  catalogo_horizontal_min_categorias: string;
  pool_aberto_scope: PoolAbertoScope;
  coleta_tempo_base_min: string;
  coleta_min_por_km: string;
  coleta_prazo_min_absoluto: string;
  coleta_prazo_max_absoluto: string;
};

export const INITIAL_FORM: RoteirizacaoForm = {
  max_detour_minutes: "15",
  max_detour_km: "3",
  max_paradas_por_rota: "6",
  max_paradas_por_rota_carro: "12",
  entregador_online_ttl_min: "10",
  raio_agrupamento_preparo_km: "1.5",
  raio_maximo_coleta_km: "15",
  catalogo_horizontal_min_produtos: "50",
  catalogo_horizontal_min_categorias: "5",
  pool_aberto_scope: "vinculados_e_externos",
};

export function fromRow(data: any): RoteirizacaoForm {
  return {
    max_detour_minutes: String(Math.round((data.max_detour_seconds ?? 900) / 60)),
    max_detour_km: String(((data.max_detour_meters ?? 3000) / 1000).toFixed(1)),
    max_paradas_por_rota: String(data.max_paradas_por_rota ?? 6),
    max_paradas_por_rota_carro: String(data.max_paradas_por_rota_carro ?? 12),
    entregador_online_ttl_min: String(data.entregador_online_ttl_min ?? 10),
    raio_agrupamento_preparo_km: String(((data.raio_agrupamento_preparo_meters ?? 1500) / 1000).toFixed(1)),
    raio_maximo_coleta_km: String(data.raio_maximo_coleta_km ?? 15),
    catalogo_horizontal_min_produtos: String(data.catalogo_horizontal_min_produtos ?? 50),
    catalogo_horizontal_min_categorias: String(data.catalogo_horizontal_min_categorias ?? 5),
    pool_aberto_scope: (data.pool_aberto_scope ?? "vinculados_e_externos") as PoolAbertoScope,
  };
}

export type ValidationResult =
  | { ok: true; payload: Record<string, number | string> }
  | { ok: false; error: string };

export function validateAndBuild(form: RoteirizacaoForm): ValidationResult {
  const minutes = Number(form.max_detour_minutes);
  const km = Number(form.max_detour_km);
  const paradas = Number(form.max_paradas_por_rota);
  const paradasCarro = Number(form.max_paradas_por_rota_carro);
  const ttl = Number(form.entregador_online_ttl_min);
  const raioKm = Number(form.raio_agrupamento_preparo_km);
  const raioMaxColeta = Number(form.raio_maximo_coleta_km);
  const catMinProd = Number(form.catalogo_horizontal_min_produtos);
  const catMinCat = Number(form.catalogo_horizontal_min_categorias);

  if (![minutes, km, paradas, paradasCarro, ttl, raioKm].every((n) => Number.isFinite(n) && n > 0)) {
    return { ok: false, error: "Todos os valores devem ser positivos" };
  }
  if (!Number.isFinite(raioMaxColeta) || raioMaxColeta < 0) {
    return { ok: false, error: "Raio máximo de coleta inválido (use 0 para desativar)" };
  }
  if (![catMinProd, catMinCat].every((n) => Number.isFinite(n) && n >= 1)) {
    return { ok: false, error: "Os limites do catálogo devem ser números inteiros ≥ 1" };
  }
  if (paradas > 20 || paradasCarro > 40) {
    return { ok: false, error: "Máximo de 20 paradas (moto) / 40 (carro) por rota" };
  }
  const scopesValidos: PoolAbertoScope[] = [
    "somente_vinculados",
    "somente_externos",
    "vinculados_e_externos",
  ];
  if (!scopesValidos.includes(form.pool_aberto_scope)) {
    return { ok: false, error: "Escopo do pool aberto inválido" };
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
      raio_maximo_coleta_km: raioMaxColeta,
      catalogo_horizontal_min_produtos: Math.round(catMinProd),
      catalogo_horizontal_min_categorias: Math.round(catMinCat),
      pool_aberto_scope: form.pool_aberto_scope,
    },
  };
}
