import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { useContratoAtivo } from "@/components/ContratoView";
import { ContratoDialog } from "@/components/ContratoDialog";
import { RoleBadge, RoleSelector } from "./components/RoleSelector";
import { SignupWizard } from "./components/SignupWizard";
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

  const handleSubmit = async () => {
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
        subtitle={step === "select" ? "Escolha seu perfil" : "Vamos criar sua conta"}
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
              Trocar perfil
            </button>

            {role && <RoleBadge role={role} />}

            {role === "loja_admin" && refCodigo && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-200">
                {indicador
                  ? <>Indicado por <strong>{indicador.fullName || indicador.nome || (indicador.tipo === "revendedor" ? "revendedor parceiro" : "entregador parceiro")}</strong> ({refCodigo})</>
                  : <>Validando código <strong>{refCodigo}</strong>…</>}
              </div>
            )}

            {role && (
              <SignupWizard
                role={role}
                form={form}
                update={update}
                handleAvatarChange={handleAvatarChange}
                contratoLoading={contratoLoading}
                contratoVersao={contratoAtivo?.versao}
                onOpenContrato={() => setContratoModalOpen(true)}
                submitting={loading}
                onSubmit={handleSubmit}
              />
            )}
          </div>
        )}
      </AuthCard>
      {contratoModalOpen && contratoAtivo && (
        <ContratoDialog contrato={contratoAtivo} onClose={() => setContratoModalOpen(false)} />
      )}
    </>
  );
}
