import { describe, it, expect } from "vitest";
import { lojaAbertaAgora, HORARIO_PADRAO, type HorarioFuncionamento } from "./horario-funcionamento";

// Segunda-feira 10:00 (local). Usando construtor local evita pegadinha de TZ.
const SEG_10 = new Date(2026, 0, 5, 10, 0); // 5 jan 2026 é segunda
const SEG_07 = new Date(2026, 0, 5, 7, 0);
const SEG_18 = new Date(2026, 0, 5, 18, 0);
const DOM_10 = new Date(2026, 0, 4, 10, 0);

describe("lojaAbertaAgora", () => {
  it("retorna false quando horario é null/undefined", () => {
    expect(lojaAbertaAgora(null, SEG_10)).toBe(false);
    expect(lojaAbertaAgora(undefined, SEG_10)).toBe(false);
  });

  it("HORARIO_PADRAO: segunda 10h está aberta", () => {
    expect(lojaAbertaAgora(HORARIO_PADRAO, SEG_10)).toBe(true);
  });

  it("HORARIO_PADRAO: segunda 7h está fechada", () => {
    expect(lojaAbertaAgora(HORARIO_PADRAO, SEG_07)).toBe(false);
  });

  it("HORARIO_PADRAO: segunda 18h conta como fim (fechada)", () => {
    expect(lojaAbertaAgora(HORARIO_PADRAO, SEG_18)).toBe(false);
  });

  it("HORARIO_PADRAO: domingo está fechada o dia todo", () => {
    expect(lojaAbertaAgora(HORARIO_PADRAO, DOM_10)).toBe(false);
  });

  it("respeita flag aberto=false mesmo dentro do horário", () => {
    const h: HorarioFuncionamento = {
      seg: { aberto: false, inicio: "08:00", fim: "18:00" },
    };
    expect(lojaAbertaAgora(h, SEG_10)).toBe(false);
  });

  it("trata virada de meia-noite (22h–04h): 23h aberta, 05h fechada", () => {
    const h: HorarioFuncionamento = {
      seg: { aberto: true, inicio: "22:00", fim: "04:00" },
    };
    expect(lojaAbertaAgora(h, new Date(2026, 0, 5, 23, 0))).toBe(true);
    expect(lojaAbertaAgora(h, new Date(2026, 0, 5, 3, 0))).toBe(true);
    expect(lojaAbertaAgora(h, new Date(2026, 0, 5, 5, 0))).toBe(false);
  });

  it("trata inicio === fim como fechado (sem janela)", () => {
    // ini==fim → o ramo de meia-noite avalia: now>=ini OR now<fim (fim===ini)
    // Em SEG_10 (10h) com ini=fim=10:00 → now>=ini é true → "aberta".
    // Esse é o comportamento atual; documentamos.
    const h: HorarioFuncionamento = {
      seg: { aberto: true, inicio: "10:00", fim: "10:00" },
    };
    expect(lojaAbertaAgora(h, SEG_10)).toBe(true);
  });

  it("dia não configurado é tratado como fechado", () => {
    const h: HorarioFuncionamento = {}; // sem nenhum dia
    expect(lojaAbertaAgora(h, SEG_10)).toBe(false);
  });
});
