import { toast } from "sonner";
import { normalizeBrPhone, onlyDigits } from "@/lib/format/document";
import { isValidCpf } from "@/lib/validation/br-documents";
import type { SignupForm } from "./use-signup-form";
import type { Role } from "./roles";
import { passwordMeetsRequirements } from "./password-rules";

export function validateSignup({ role, form }: { role: Role; form: SignupForm; contratoLoading?: boolean; contratoId?: string }): boolean {
  if (role !== "entregador") return fail("Somente cadastro de entregadores está disponível no ROTA 66.");
  const fullName = form.fullName.trim();
  if (fullName.length < 3) return fail("Informe seu nome completo");
  const phone = normalizeBrPhone(form.phone);
  if (!phone || phone.length < 10 || phone.length > 11) return fail("Telefone inválido");
  if (!isValidCpf(onlyDigits(form.cpf))) return fail("CPF inválido");
  if (!form.cityId) return fail("Selecione a cidade em que você vai atuar");
  if (!form.avatarFile) return fail("A foto de perfil é obrigatória");
  if (!passwordMeetsRequirements(form.password)) return fail("A senha não atende aos requisitos");
  return true;
}

function fail(msg: string) {
  toast.error(msg);
  return false;
}

export function buildSignupMetadata(role: Role, form: SignupForm) {
  const cpf = onlyDigits(form.cpf);
  return {
    full_name: form.fullName.trim(),
    phone: normalizeBrPhone(form.phone),
    role,
    cpf: cpf || undefined,
    tipo_veiculo: form.tipoVeiculo,
    city_id: form.cityId,
  };
}

export function mapSignupError(message: string, _hasCpf: boolean): string {
  if (/cpf/i.test(message) && /duplicate|unique|já|existe/i.test(message)) return "Este CPF já está cadastrado.";
  if (/cpf/i.test(message)) return "CPF inválido";
  return message || "Não foi possível criar o cadastro.";
}
