import { Link } from "@tanstack/react-router";
import { AuthCard } from "@/components/AuthCard";
import { SignupWizard } from "./components/SignupWizard";
import type { Role } from "./logic/roles";
import { useSignupForm } from "./logic/use-signup-form";
import { useSignupSubmit } from "./logic/use-signup-submit";
import { useIndicador } from "./logic/use-indicador";

export function CadastroPage({
  initialRole = "entregador",
  refCodigo,
  redirectTo,
}: { initialRole?: Role; refCodigo?: string; redirectTo?: string } = {}) {
  const { form, update, handleAvatarChange } = useSignupForm();
  const indicador = useIndicador(refCodigo);
  const { submit } = useSignupSubmit({
    role: initialRole,
    form,
    contratoLoading: false,
    indicadorId: indicador?.id ?? null,
    indicadorTipo: indicador?.tipo ?? null,
    redirectTo,
  });

  return (
    <AuthCard
      title="CADASTRO DE ENTREGADOR"
      subtitle="Entre para a operação logística da ROTA 66"
      footer={
        <>
          Já tem conta?{" "}
          <Link to="/login" className="text-primary font-bold hover:underline">Entrar</Link>
        </>
      }
    >
      <SignupWizard
        role="entregador"
        form={form}
        update={update}
        handleAvatarChange={handleAvatarChange}
        contratoLoading={false}
        submitting={false}
        onSubmit={submit}
      />
    </AuthCard>
  );
}
