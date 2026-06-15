// Gerador de Pix "Copia e Cola" (EMV BR Code) com valor embutido.
// Especificação: Manual BR Code do Banco Central + EMVCo MPM.

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

// CRC16/CCITT-FALSE — polinômio 0x1021, init 0xFFFF.
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// Remove acentos e caracteres não permitidos no BR Code.
function sanitize(text: string, maxLen: number): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 .,-]/g, "")
    .trim()
    .slice(0, maxLen)
    .toUpperCase();
}

export interface PixBrCodeInput {
  chave: string;
  valor?: number | null;
  recebedor?: string | null;
  cidade?: string | null;
  txid?: string | null;
}

// Normaliza a chave PIX para o formato exigido pelo padrão EMV BR Code:
// - CPF: 11 dígitos puros, sem pontos/traços
// - CNPJ: 14 dígitos puros
// - Telefone BR: "+55" + DDD + número (apenas dígitos)
// - Email: minúsculo, sem espaços
// - Chave aleatória (UUID): minúsculo, sem espaços
export function normalizarChavePix(raw: string): string {
  const v = (raw ?? "").trim();
  if (!v) return v;

  // Email
  if (/@/.test(v)) return v.toLowerCase().replace(/\s+/g, "");

  // UUID (chave aleatória)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.replace(/\s+/g, ""))) {
    return v.toLowerCase().replace(/\s+/g, "");
  }

  const digits = v.replace(/\D/g, "");

  // CPF
  if (digits.length === 11 && !v.startsWith("+")) return digits;
  // CNPJ
  if (digits.length === 14) return digits;
  // Telefone: se já tem +, usa como está (apenas dígitos com +55)
  if (v.startsWith("+")) return "+" + digits;
  // Telefone BR sem +: 10 ou 11 dígitos (DDD + número)
  if (digits.length === 10 || digits.length === 11) return "+55" + digits;
  // Telefone com código de país já incluso (12-13 dígitos)
  if (digits.length === 12 || digits.length === 13) return "+" + digits;

  // Fallback: devolve sem espaços
  return v.replace(/\s+/g, "");
}

export function gerarPixBrCode({ chave, valor, recebedor, cidade, txid }: PixBrCodeInput): string {
  const chaveNormalizada = normalizarChavePix(chave);
  const merchantAccount =
    tlv("00", "BR.GOV.BCB.PIX") + tlv("01", chaveNormalizada);


  const nome = sanitize(recebedor ?? "RECEBEDOR", 25) || "RECEBEDOR";
  const city = sanitize(cidade ?? "BRASIL", 15) || "BRASIL";
  const tx = sanitize(txid ?? "***", 25) || "***";

  let payload =
    tlv("00", "01") + // Payload Format Indicator
    tlv("26", merchantAccount) + // Merchant Account Information - PIX
    tlv("52", "0000") + // Merchant Category Code
    tlv("53", "986"); // Transaction Currency - BRL

  if (valor != null && Number.isFinite(valor) && valor > 0) {
    payload += tlv("54", Number(valor).toFixed(2));
  }

  payload +=
    tlv("58", "BR") +
    tlv("59", nome) +
    tlv("60", city) +
    tlv("62", tlv("05", tx));

  // CRC field: id + len + 4 hex chars
  const partial = payload + "6304";
  return partial + crc16(partial);
}
