import { describe, it, expect } from "vitest";
import { formatDateTime, formatDate, formatTime, formatRelative } from "./date";

const ISO = "2026-01-15T13:45:00";

describe("formatDateTime", () => {
  it("formata Date", () => {
    expect(formatDateTime(new Date(ISO))).toMatch(/15\/01\/2026.*13:45/);
  });

  it("formata string ISO", () => {
    expect(formatDateTime(ISO)).toMatch(/15\/01\/2026/);
  });

  it("retorna string vazia para entrada inválida", () => {
    expect(formatDateTime(null)).toBe("");
    expect(formatDateTime(undefined)).toBe("");
    expect(formatDateTime("não-é-data")).toBe("");
  });
});

describe("formatDate", () => {
  it("formata apenas a data", () => {
    expect(formatDate(ISO)).toBe("15/01/2026");
  });
});

describe("formatTime", () => {
  it("formata apenas a hora", () => {
    expect(formatTime(ISO)).toBe("13:45");
  });
});

describe("formatRelative", () => {
  const NOW = new Date("2026-01-15T13:45:00");

  it('retorna "agora" para diferença < 1 min', () => {
    expect(formatRelative(new Date(NOW.getTime() - 30_000), NOW)).toBe("agora");
  });

  it("formata minutos", () => {
    expect(formatRelative(new Date(NOW.getTime() - 5 * 60_000), NOW)).toBe("há 5 min");
  });

  it("formata horas", () => {
    expect(formatRelative(new Date(NOW.getTime() - 3 * 3600_000), NOW)).toBe("há 3 h");
  });

  it("formata dias", () => {
    expect(formatRelative(new Date(NOW.getTime() - 2 * 86400_000), NOW)).toBe("há 2 d");
  });

  it('retorna "agora" para datas no futuro', () => {
    expect(formatRelative(new Date(NOW.getTime() + 60_000), NOW)).toBe("agora");
  });

  it("retorna string vazia para entrada inválida", () => {
    expect(formatRelative(null, NOW)).toBe("");
  });
});
