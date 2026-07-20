import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AuthCard, AuthInput, AuthPasswordInput, PrimaryButton } from "@/components/AuthCard";
import { sanitizeEmail, sanitizeName, sanitizePhone } from "@/lib/sanitize";
import { normalizeBrPhone } from "@/lib/format/document";
import { useContratoAtivo } from "@/components/ContratoView";
import { ContratoDialog } from "@/components/ContratoDialog";
import { ClienteFields } from "./components/ClienteFields";
import { EntregadorFields } from "./components/EntregadorFields";
import { LojaFields } from "./components/LojaFields";
import { PasswordRequirements } from "./components/PasswordRequirements";
import { RoleBadge, RoleSelector } from "./components/RoleSelector";
import type { Role } from "./logic/roles";
import { useSignupForm } from "./logic/use-signup-form";
import { useSignupSubmit } from "./logic/use-signup-submit";
import { useIndicador } from "./logic/use-indicador";

export function CadastroPage({
  initialRole,
  refCodigo,
  redirectTo,
}: { initialRole?: Role; refCodigo?: string; redirectTo?: string } = {}) {
  const [step, setStep] = useState<"select" | "form">(initialRole ? "form" : "select");
  const [role, setRole] = useState<Role | null>(initialRole ?? null);
  const [loading, setLoading] = useState(false);
  const [contratoModalOpen, setContratoModalOpen] = useState(false);

  const { form, update, handleAvatarChange } = useSignupForm();
  const { contrato: contratoAtivo, loading: contratoLoading } = useContratoAtivo();
  const indicador = useIndicador(refCodigo);
  const { submit } = useSignupSubmit({
    role,
    form,
    contratoAtivo,
    contratoLoading,
    indicadorId: indicador?.id ?? null,
    indicadorTipo: indicador?.tipo ?? null,
    redirectTo,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await submit();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthCard
        title="ENTRE NA ROTA"
        subtitle={step === "select" ? "Escolha seu perfil" : "Complete seu cadastro"}
        footer={
          <>
            Já tem conta?{" "}
            <Link to="/login" className="text-primary font-bold hover:underline">
              Entrar
            </Link>
          </>
        }
      >
        {step === "select" ? (
          <RoleSelector
            onPick={(r) => {
              setRole(r);
              setStep("form");
            }}
          />
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setStep("select");
                setRole(null);
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>

            {role && <RoleBadge role={role} />}

            {role === "loja_admin" && refCodigo && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-200">
                {indicador
                  ? <>Indicado por <strong>{indicador.fullName || indicador.nome || (indicador.tipo === "revendedor" ? "revendedor parceiro" : "entregador parceiro")}</strong> ({refCodigo})</>
                  : <>Validando código <strong>{refCodigo}</strong>…</>}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <AuthInput
                label={role === "loja_admin" ? "Nome do responsável" : "Nome completo"}
                required
                value={form.fullName}
                onChange={(e) => update("fullName", sanitizeName(e.target.value, 120))}
                maxLength={120}
                autoComplete="name"
              />

              {role === "loja_admin" && (
                <AuthInput
                  label="Nome da loja"
                  required
                  value={form.nomeLoja}
                  onChange={(e) => update("nomeLoja", sanitizeName(e.target.value, 120))}
                  placeholder="Ex.: Pizzaria do Zé"
                  maxLength={120}
                  autoComplete="organization"
                />
              )}

              <AuthInput
                label="Telefone"
                type="tel"
                inputMode="tel"
                required
                value={form.phone}
                onChange={(e) => update("phone", normalizeBrPhone(sanitizePhone(e.target.value, 16)))}
                placeholder="(11) 99999-9999"
                maxLength={20}
                autoComplete="tel"
              />

              {role === "loja_admin" && (
                <LojaFields
                  nomeLoja={form.nomeLoja}
                  setNomeLoja={(v) => update("nomeLoja", v)}
                  cnpj={form.cnpj}
                  setCnpj={(v) => update("cnpj", v)}
                  categoria={form.categoria}
                  setCategoria={(v) => update("categoria", v)}
                  cityId={form.cityId}
                  setCityId={(v) => update("cityId", v)}
                  aceiteContrato={form.aceiteContrato}
                  setAceiteContrato={(v) => update("aceiteContrato", v)}
                  contratoVersao={contratoAtivo?.versao}
                  onOpenContrato={() => setContratoModalOpen(true)}
                />
              )}

              {role === "entregador" && (
                <EntregadorFields
                  cpf={form.cpf}
                  setCpf={(v) => update("cpf", v)}
                  tipoVeiculo={form.tipoVeiculo}
                  setTipoVeiculo={(v) => update("tipoVeiculo", v)}
                  cityId={form.cityId}
                  setCityId={(v) => update("cityId", v)}
                  avatarFile={form.avatarFile}
                  avatarPreview={form.avatarPreview}
                  onAvatarChange={handleAvatarChange}
                />
              )}

              {role === "cliente" && (
                <ClienteFields
                  cpf={form.cpf}
                  setCpf={(v) => update("cpf", v)}
                  endereco={form.endereco}
                  setEndereco={(v) => update("endereco", v)}
                  cidade={form.cidade}
                  setCidade={(v) => update("cidade", v)}
                  estado={form.estado}
                  setEstado={(v) => update("estado", v)}
                />
              )}


              <AuthInput
                label="E-mail"
                type="email"
                inputMode="email"
                required
                value={form.email}
                onChange={(e) => update("email", sanitizeEmail(e.target.value))}
                maxLength={254}
                autoComplete="email"
              />
              <AuthPasswordInput
                label="Senha"
                required
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                minLength={8}
                placeholder="Crie uma senha forte"
              />
              <PasswordRequirements password={form.password} />

              <PrimaryButton
                type="submit"
                disabled={loading || (role === "loja_admin" && contratoLoading)}
              >
                {loading
                  ? "Criando..."
                  : role === "loja_admin" && contratoLoading
                    ? "Carregando termos..."
                    : "Criar conta"}
              </PrimaryButton>
            </form>
          </div>
        )}
      </AuthCard>
      {contratoModalOpen && contratoAtivo && (
        <ContratoDialog contrato={contratoAtivo} onClose={() => setContratoModalOpen(false)} />
      )}
    </>
  );
}
