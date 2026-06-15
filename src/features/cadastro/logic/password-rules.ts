export const PASSWORD_RULES = [
  { key: "length", label: "Pelo menos 8 caracteres", test: (p: string) => p.length >= 8 },
  { key: "upper", label: "Uma letra maiúscula (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
  { key: "lower", label: "Uma letra minúscula (a–z)", test: (p: string) => /[a-z]/.test(p) },
  { key: "number", label: "Um número (0–9)", test: (p: string) => /\d/.test(p) },
  { key: "special", label: "Um caractere especial (!@#$…)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export function passwordMeetsRequirements(p: string) {
  return PASSWORD_RULES.every((r) => r.test(p));
}

export function passwordStrength(password: string) {
  const results = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(password) }));
  const passed = results.filter((r) => r.ok).length;
  const pct = (passed / results.length) * 100;
  const label =
    passed <= 1 ? "Muito fraca" : passed === 2 ? "Fraca" : passed === 3 ? "Razoável" : passed === 4 ? "Boa" : "Forte";
  const color =
    passed <= 1
      ? "bg-destructive"
      : passed === 2
        ? "bg-orange-500"
        : passed === 3
          ? "bg-yellow-500"
          : passed === 4
            ? "bg-lime-500"
            : "bg-emerald-500";
  return { results, passed, pct, label, color };
}
