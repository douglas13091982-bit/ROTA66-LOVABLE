import { toast } from "sonner";
import { normalizeBrPhone, onlyDigits } from "@/lib/format/document";
import { isValidCnpj, isValidCpf } from "@/lib/validation/br-documents";
import type { SignupForm } from "./use-signup-form";
import type { Role } from "./roles";
import { passwordMeetsRequirements } from "./password-rules";

type Ctx = {
  role: Role;
  form: SignupForm;
  contratoLoading: boolean;
  contratoId: string | undefined;
};

/** Retorna true se passou na validação; senão exibe toast e retorna false. */
export function validateSignup({ role, form, contratoLoading, contratoId }: Ctx): boolean {
  // Campos obrigatórios para TODOS os perfis — evita perfis vazios no banco
  const fullName = form.fullName.trim();
  if (fullName.length < 3) return fail("Informe seu nome completo (mínimo 3 caracteres)");
  if (fullName.length > 120) return fail("Nome muito longo (máximo 120 caracteres)");

  const phoneDigits = normalizeBrPhone(form.phone);
  if (!phoneDigits) return fail("Telefone é obrigatório");
  if (phoneDigits.length < 10 || phoneDigits.length > 11) {
    return fail("Telefone inválido. Use DDD + número (ex.: 11999999999), sem o 55.");
  }

  if (!passwordMeetsRequirements(form.password)) {
    toast.error("A senha não atende a todos os requisitos");
    return false;
  }
  const cpfDigits = onlyDigits(form.cpf);
  const cnpjDigits = onlyDigits(form.cnpj);

  if (role === "entregador") {
    if (!cpfDigits) return fail("CPF é obrigatório para entregadores");
    if (!isValidCpf(cpfDigits)) return fail("CPF inválido");
    if (!form.cityId) return fail("Selecione a cidade em que você vai atuar");
    if (!form.avatarFile) return fail("A foto de perfil é obrigatória para entregadores");
    return true;
  }

  if (role === "loja_admin") {
    if (!form.nomeLoja.trim()) return fail("Informe o nome da loja");
    if (!cnpjDigits) return fail("CNPJ é obrigatório para lojas");
    if (!isValidCnpj(cnpjDigits)) return fail("CNPJ inválido");
    if (!form.categoria) return fail("Selecione a categoria de atuação da loja");
    if (!form.cityId) return fail("Selecione a cidade da loja");
    if (!form.aceiteContrato) return fail("Você precisa aceitar os Termos de Uso para continuar");
    if (contratoLoading || !contratoId) {
      return fail("Aguarde o carregamento dos Termos de Uso e tente novamente.");
    }
    if (cpfDigits && !isValidCpf(cpfDigits)) return fail("CPF inválido");
    return true;
  }

  if (role === "cliente") {
    if (!cpfDigits) return fail("CPF é obrigatório");
    if (!isValidCpf(cpfDigits)) return fail("CPF inválido");
    if (!form.endereco.trim() || !form.cidade.trim() || !form.estado.trim()) {
      return fail("Informe endereço, cidade e estado para continuar.");
    }
    if (form.estado.trim().length !== 2) {
      return fail("Use a sigla do estado com 2 letras (ex.: SP).");
    }
  }
  return true;
}

function fail(msg: string) {
  toast.error(msg);
  return false;
}

export function buildSignupMetadata(role: Role, form: SignupForm) {
  const cpfDigits = onlyDigits(form.cpf);
  const fullName = form.fullName.trim();
  const phone = normalizeBrPhone(form.phone);
  // Garantia: nunca enviar string vazia — o trigger create_profile_from_signup
  // confia nesses campos para popular o profile.
  if (!fullName || !phone) {
    throw new Error("Nome e telefone são obrigatórios para criar a conta.");
  }
  return {
    full_name: fullName,
    phone,
    role,
    cpf: cpfDigits || undefined,
    tipo_veiculo: role === "entregador" ? form.tipoVeiculo : undefined,
    city_id: role === "entregador" ? form.cityId || undefined : undefined,
    endereco: role === "cliente" ? form.endereco.trim() : undefined,
    cidade: role === "cliente" ? form.cidade.trim() : undefined,
    estado: role === "cliente" ? form.estado.trim().toUpperCase() : undefined,
  };
}

export function mapSignupError(message: string, hasCpf: boolean): string {
  if (/cpf/i.test(message)) {
    return message.includes("já existe") || message.includes("já está cadastrado")
      ? "Este CPF já está cadastrado."
      : "CPF inválido";
  }
  if (/database error saving new user/i.test(message) && hasCpf) {
    return "Este CPF já está cadastrado.";
  }
  return message;
}

export function buildSlug(nomeLoja: string): string {
  const base =
    nomeLoja
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "loja";
  const suffix =
    globalThis.crypto?.randomUUID?.().replace(/-/g, "").slice(0, 8) ??
    Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  return `${base}-${suffix}`;
}

export function mapLojaInsertError(rawMsg: string): string {
  if (/slug/i.test(rawMsg)) {
    return "Não foi possível gerar um identificador único para a loja. Tente novamente.";
  }
  if (/cnpj/i.test(rawMsg)) {
    return rawMsg.includes("duplicate") || rawMsg.includes("unique")
      ? "Este CNPJ já está cadastrado."
      : "CNPJ inválido";
  }
  return rawMsg || "erro desconhecido";
}
