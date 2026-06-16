import { describe, it, expect } from "vitest";
import {
  agruparPedidosPorRota,
  mesclarPedidosDisponiveis,
} from "./pedido-agrupador";
import type { PedidoDisponivel } from "@/types/pedido";

const p = (over: Partial<PedidoDisponivel>): PedidoDisponivel =>
  ({
    id: over.id ?? "id-default",
    loja_id: "loja-1",
    rota_id: null,
    endereco_coleta: "Rua Coleta, 1",
    endereco_coleta_lat: null,
    endereco_coleta_lng: null,
    ...over,
  }) as PedidoDisponivel;

describe("mesclarPedidosDisponiveis", () => {
  it("retorna lista vazia quando ambos são undefined", () => {
    expect(mesclarPedidosDisponiveis(undefined, undefined)).toEqual([]);
  });

  it("marca vinculados com _externo = false", () => {
    const r = mesclarPedidosDisponiveis([p({ id: "a" })], []);
    expect(r).toHaveLength(1);
    expect(r[0]._externo).toBe(false);
  });

  it("marca externos com _externo = true", () => {
    const r = mesclarPedidosDisponiveis([], [p({ id: "a" })]);
    expect(r[0]._externo).toBe(true);
  });

  it("vinculado tem prioridade sobre externo com o mesmo id", () => {
    const r = mesclarPedidosDisponiveis(
      [p({ id: "a", loja_id: "vinc" })],
      [p({ id: "a", loja_id: "ext" })],
    );
    expect(r).toHaveLength(1);
    expect(r[0]._externo).toBe(false);
    expect(r[0].loja_id).toBe("vinc");
  });

  it("mescla preservando ordem de inserção (vinculados primeiro)", () => {
    const r = mesclarPedidosDisponiveis(
      [p({ id: "a" }), p({ id: "b" })],
      [p({ id: "c" })],
    );
    expect(r.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});

describe("agruparPedidosPorRota", () => {
  it("retorna lista vazia para entrada vazia", () => {
    expect(agruparPedidosPorRota([])).toEqual([]);
  });

  it("agrupa pedidos com mesmo rota_id em um único grupo", () => {
    const r = agruparPedidosPorRota([
      p({ id: "a", rota_id: "R1" }),
      p({ id: "b", rota_id: "R1" }),
      p({ id: "c", rota_id: "R2" }),
    ]);
    expect(r).toHaveLength(2);
    const r1 = r.find((g) => g.key === "rota:R1");
    expect(r1?.items).toHaveLength(2);
    expect(r1?.isRota).toBe(true);
  });

  it("agrupa por loja+coleta quando não há rota_id (mesmas coords)", () => {
    const r = agruparPedidosPorRota([
      p({ id: "a", endereco_coleta_lat: -26.3, endereco_coleta_lng: -48.85 }),
      p({ id: "b", endereco_coleta_lat: -26.3, endereco_coleta_lng: -48.85 }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].items).toHaveLength(2);
  });

  it("considera grupos com 1 item como isRota=false", () => {
    const r = agruparPedidosPorRota([p({ id: "a", rota_id: "R1" })]);
    expect(r[0].isRota).toBe(false);
  });

  it("agrupa por string normalizada de endereço quando coords ausentes", () => {
    const r = agruparPedidosPorRota([
      p({ id: "a", endereco_coleta: "Rua X, 1" }),
      p({ id: "b", endereco_coleta: "  rua x,   1  " }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].items).toHaveLength(2);
  });

  it("separa grupos quando lojas diferentes mesmo com mesma coleta", () => {
    const r = agruparPedidosPorRota([
      p({ id: "a", loja_id: "L1", endereco_coleta: "Rua X" }),
      p({ id: "b", loja_id: "L2", endereco_coleta: "Rua X" }),
    ]);
    expect(r).toHaveLength(2);
  });

  it("filtra grupos cuja chave está em dismissed", () => {
    const r = agruparPedidosPorRota(
      [p({ id: "a", rota_id: "R1" }), p({ id: "b", rota_id: "R2" })],
      ["rota:R1"],
    );
    expect(r).toHaveLength(1);
    expect(r[0].key).toBe("rota:R2");
  });

  it("coords com pequenas variações além da 5ª casa decimal não unem grupos", () => {
    // 0.00001 ≈ 1.1 m → COORD_PRECISION = 5 → chaves diferentes
    const r = agruparPedidosPorRota([
      p({ id: "a", endereco_coleta_lat: -26.30000, endereco_coleta_lng: -48.85000 }),
      p({ id: "b", endereco_coleta_lat: -26.30001, endereco_coleta_lng: -48.85000 }),
    ]);
    expect(r).toHaveLength(2);
  });
});
