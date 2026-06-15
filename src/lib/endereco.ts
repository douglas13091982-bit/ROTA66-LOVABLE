/**
 * Utilitários de parsing de endereço brasileiro.
 * Funções puras, sem dependência de React ou Supabase.
 */

const BAIRRO_MIN_LEN = 2;
const BAIRRO_MAX_LEN = 60;

export function normalizarEndereco(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Remove CEP e estado (UF) do final de um endereço brasileiro,
 * mantendo rua, número, bairro e cidade.
 */
export function resumirEnderecoEntrega(endereco?: string | null): string {
  const limpo = normalizarEndereco(endereco);
  if (!limpo) return "—";

  let s = limpo
    .replace(/\s*,?\s*\d{5}-?\d{3}\s*$/, "") // CEP no final
    .replace(/\s*-\s*[A-Z]{2}\s*$/, "") // " - SC" no final
    .replace(/,\s*[A-Z]{2}\s*$/, "") // ", SC" no final
    .replace(/,\s*[A-Z]{2}\s*,/, ",") // ", SC, " no meio
    .replace(/\s*-\s*[A-Z]{2}\s*,/, ","); // " - SC, " no meio

  return s.replace(/,\s*$/, "").replace(/\s*-\s*$/, "").trim() || "—";
}

/**
 * Extrai o bairro de um endereço no formato brasileiro:
 * "Rua X, 123 - Bairro Y, Cidade - UF, CEP" ou "Rua X, 123, Bairro Y, Cidade - UF".
 */
export function extrairBairro(endereco?: string | null): string | null {
  const limpo = normalizarEndereco(endereco);
  if (!limpo) return null;

  const porHifen = extrairAposHifen(limpo);
  if (porHifen) return porHifen;

  const porVirgulaAposNumero = extrairAposNumero(limpo);
  if (porVirgulaAposNumero) return porVirgulaAposNumero;

  return penultimoSegmento(limpo);
}

function extrairAposHifen(endereco: string): string | null {
  const match = endereco.match(/-\s*([^,\-]+?)\s*(?:,|-|$)/);
  if (!match || !match[1]) return null;
  const cand = match[1].trim();
  if (/^\d/.test(cand)) return null;
  if (cand.length < BAIRRO_MIN_LEN || cand.length > BAIRRO_MAX_LEN) return null;
  return cand;
}

function extrairAposNumero(endereco: string): string | null {
  const partes = endereco.split(",").map((s) => s.trim()).filter(Boolean);
  for (let i = 0; i < partes.length; i++) {
    if (/^\d+[A-Za-z]?$/.test(partes[i]) && partes[i + 1]) {
      return partes[i + 1].split("-")[0].trim() || null;
    }
  }
  return null;
}

function penultimoSegmento(endereco: string): string | null {
  const partes = endereco.split(",").map((s) => s.trim()).filter(Boolean);
  return partes.length >= 3 ? partes[partes.length - 3] || null : null;
}
