import { describe, it, expect } from "vitest";
import { haversineKm, ambosDefinidos } from "./geo";

describe("haversineKm", () => {
  it("retorna 0 para o mesmo ponto (objeto)", () => {
    expect(haversineKm({ lat: -26.3, lng: -48.85 }, { lat: -26.3, lng: -48.85 })).toBe(0);
  });

  it("retorna 0 para o mesmo ponto (4 argumentos)", () => {
    expect(haversineKm(0, 0, 0, 0)).toBe(0);
  });

  it("calcula ~417 km entre SP e RJ (margem ±5 km)", () => {
    // SP: -23.5505, -46.6333 | RJ: -22.9068, -43.1729
    const km = haversineKm(-23.5505, -46.6333, -22.9068, -43.1729);
    expect(km).toBeGreaterThan(355);
    expect(km).toBeLessThan(365);
  });

  it("calcula distâncias curtas (~1 km) com boa precisão", () => {
    // ~1° de lat em latitudes médias ≈ 111 km
    // 0.009° ≈ 1 km
    const km = haversineKm(-26.3, -48.85, -26.309, -48.85);
    expect(km).toBeGreaterThan(0.95);
    expect(km).toBeLessThan(1.05);
  });

  it("é simétrica: d(a,b) === d(b,a)", () => {
    const ab = haversineKm(-26.3, -48.85, -26.4, -48.9);
    const ba = haversineKm(-26.4, -48.9, -26.3, -48.85);
    expect(ab).toBeCloseTo(ba, 10);
  });

  it("lida com o anti-meridiano (180° / -180°)", () => {
    // Pontos próximos atravessando o meridiano 180
    const km = haversineKm(0, 179.99, 0, -179.99);
    // 0.02° no equador ≈ 2.22 km
    expect(km).toBeGreaterThan(2);
    expect(km).toBeLessThan(2.5);
  });

  it("calcula distância entre polos (~20 015 km)", () => {
    const km = haversineKm(-90, 0, 90, 0);
    expect(km).toBeGreaterThan(20000);
    expect(km).toBeLessThan(20030);
  });
});

describe("ambosDefinidos", () => {
  it("retorna true quando lat e lng dos dois pontos estão presentes", () => {
    expect(ambosDefinidos({ lat: 1, lng: 2 }, { lat: 3, lng: 4 })).toBe(true);
  });

  it("retorna false quando um dos pontos é null", () => {
    expect(ambosDefinidos(null, { lat: 3, lng: 4 })).toBe(false);
    expect(ambosDefinidos({ lat: 1, lng: 2 }, null)).toBe(false);
  });

  it("retorna false quando alguma coordenada é null", () => {
    expect(ambosDefinidos({ lat: null, lng: 2 }, { lat: 3, lng: 4 })).toBe(false);
    expect(ambosDefinidos({ lat: 1, lng: 2 }, { lat: 3, lng: null })).toBe(false);
  });

  it("aceita zero como coordenada válida", () => {
    expect(ambosDefinidos({ lat: 0, lng: 0 }, { lat: 0, lng: 0 })).toBe(true);
  });
});
