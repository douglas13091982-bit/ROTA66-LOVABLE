import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { AuthInput, AuthPasswordInput } from "@/components/AuthCard";
import { sanitizeDigits, sanitizeEmail, sanitizeName, sanitizePhone } from "@/lib/sanitize";
import { normalizeBrPhone, onlyDigits } from "@/lib/format/document";
import { isValidCpf } from "@/lib/validation/br-documents";
import { useCidades } from "@/hooks/use-cidades";
import { Bike, Car, Zap } from "lucide-react";
import { PasswordRequirements } from "./PasswordRequirements";
import { passwordMeetsRequirements } from "../logic/password-rules";
import type { Role } from "../logic/roles";
import type { SignupForm } from "../logic/use-signup-form";

type StepDef = { key: string; title: string; render: () => React.ReactNode; validate: () => string | null };

type Props = {
  role: Role;
  form: SignupForm;
  update: <K extends keyof SignupForm>(k: K, v: SignupForm[K]) => void;
  handleAvatarChange: (file: File | null) => void;
  contratoLoading: boolean;
  submitting: boolean;
  onSubmit: () => void;
};

export function SignupWizard({ form, update, handleAvatarChange, submitting, onSubmit }: Props) {
  const { cidades, isLoading: loadingCidades } = useCidades();
  const [step, setStep] = useState(0);

  const steps = useMemo<StepDef[]>(() => {
    const nome: StepDef = {
      key: "nome", title: "Seu nome completo",
      render: () => <AuthInput label="Nome" required autoFocus value={form.fullName} onChange={(e) => update("fullName", sanitizeName(e.target.value, 120).toUpperCase())} maxLength={120} autoComplete="name" />,
      validate: () => form.fullName.trim().length < 3 ? "Informe seu nome completo" : null,
    };
    const telefone: StepDef = {
      key: "telefone", title: "Telefone com DDD",
      render: () => <AuthInput label="Telefone" type="tel" inputMode="tel" required autoFocus value={form.phone} onChange={(e) => update("phone", normalizeBrPhone(sanitizePhone(e.target.value, 16)))} placeholder="(47) 99999-9999" maxLength={20} autoComplete="tel" />,
      validate: () => {
        const d = normalizeBrPhone(form.phone);
        return !d ? "Telefone é obrigatório" : d.length < 10 || d.length > 11 ? "Telefone inválido" : null;
      },
    };
    const cpf: StepDef = {
      key: "cpf", title: "Seu CPF",
      render: () => <AuthInput label="CPF" inputMode="numeric" required autoFocus value={form.cpf} onChange={(e) => update("cpf", sanitizeDigits(e.target.value, 11))} placeholder="000.000.000-00" maxLength={11} />,
      validate: () => {
        const d = onlyDigits(form.cpf);
        return !d ? "CPF é obrigatório" : !isValidCpf(d) ? "CPF inválido" : null;
      },
    };
    const cidade: StepDef = {
      key: "cidade", title: "Cidade onde vai atuar",
      render: () => (
        <label className="block">
          <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-2.5">Cidade</span>
          <select required autoFocus value={form.cityId} onChange={(e) => update("cityId", e.target.value)} disabled={loadingCidades} className="w-full bg-background/60 border border-border/60 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary/70">
            <option value="">{loadingCidades ? "Carregando..." : "Selecione sua cidade"}</option>
            {cidades.map((c) => <option key={c.id} value={c.id}>{c.nome} — {c.uf}</option>)}
          </select>
        </label>
      ),
      validate: () => !form.cityId ? "Selecione sua cidade" : null,
    };
    const veiculo: StepDef = {
      key: "veiculo", title: "Qual seu veículo?",
      render: () => {
        const opts = [
          { value: "moto" as const, label: "Moto", Icon: Bike },
          { value: "carro" as const, label: "Carro", Icon: Car },
          { value: "bike_eletrica" as const, label: "Bike elétrica", Icon: Zap },
        ];
        return <div className="grid grid-cols-3 gap-2">{opts.map(({ value, label, Icon }) => {
          const selected = form.tipoVeiculo === value;
          return <button key={value} type="button" onClick={() => update("tipoVeiculo", value)} className={`relative p-4 rounded-lg border-2 text-center transition-all ${selected ? "border-primary bg-primary/15 ring-2 ring-primary/40" : "border-border/70 bg-background/40 hover:border-primary/50"}`}>
            {selected && <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><Check className="h-3 w-3" /></span>}
            <Icon className={`h-7 w-7 mx-auto mb-1 ${selected ? "text-primary" : "text-muted-foreground"}`} />
            <div className={`font-display text-sm ${selected ? "text-primary font-bold" : "text-foreground"}`}>{label}</div>
          </button>;
        })}</div>;
      },
      validate: () => null,
    };
    const avatar: StepDef = {
      key: "avatar", title: "Foto de perfil",
      render: () => <div>
        <div className="flex items-center gap-4">
          <div className={`h-24 w-24 rounded-full border-2 bg-background overflow-hidden flex items-center justify-center text-muted-foreground text-xs shrink-0 ${form.avatarPreview ? "border-border" : "border-destructive"}`}>
            {form.avatarPreview ? <img src={form.avatarPreview} alt="" className="h-full w-full object-cover" /> : "Obrigatória"}
          </div>
          <label className="cursor-pointer px-4 py-2 bg-muted hover:bg-muted/70 rounded-md text-sm font-bold uppercase tracking-wider">
            {form.avatarFile ? "Trocar foto" : "Escolher foto"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">Obrigatória. Máx 3MB.</p>
      </div>,
      validate: () => !form.avatarFile ? "Envie sua foto de perfil" : null,
    };
    const emailSenha: StepDef = {
      key: "emailSenha", title: "E-mail e senha de acesso",
      render: () => <>
        <AuthInput label="E-mail" type="email" inputMode="email" required autoFocus value={form.email} onChange={(e) => update("email", sanitizeEmail(e.target.value))} maxLength={254} autoComplete="email" />
        <AuthPasswordInput label="Senha" required value={form.password} onChange={(e) => update("password", e.target.value)} minLength={8} placeholder="Crie uma senha forte" />
        <PasswordRequirements password={form.password} />
      </>,
      validate: () => !form.email.trim() ? "Informe seu e-mail" : !/^\S+@\S+\.\S+$/.test(form.email) ? "E-mail inválido" : !passwordMeetsRequirements(form.password) ? "A senha não atende aos requisitos" : null,
    };
    return [nome, telefone, cpf, cidade, veiculo, avatar, emailSenha];
  }, [form, update, cidades, loadingCidades, handleAvatarChange]);

  const current = steps[step];
  const isLast = step === steps.length - 1;

  function next() {
    const err = current.validate();
    if (err) return toast.error(err);
    if (isLast) onSubmit();
    else setStep((s) => s + 1);
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
          <span>Passo {step + 1} de {steps.length}</span>
          <span>{Math.round(((step + 1) / steps.length) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-background/60 rounded-full overflow-hidden"><div className="h-full bg-primary transition-all duration-500" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      </div>
      <h2 className="font-display text-2xl leading-tight">{current.title}</h2>
      <form onSubmit={(e) => { e.preventDefault(); next(); }} className="space-y-4">
        <div key={current.key}>{current.render()}</div>
        <div className="flex items-center gap-3 pt-2">
          {step > 0 && <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={submitting} className="flex items-center gap-1.5 px-4 py-3 rounded-lg border border-border/60 text-sm font-bold uppercase tracking-wider hover:bg-background/60 disabled:opacity-50"><ArrowLeft className="h-4 w-4" /> Voltar</button>}
          <button type="submit" disabled={submitting} className="flex-1 flex items-center justify-center gap-2 bg-gradient-red shadow-elevated text-primary-foreground font-display text-lg tracking-[0.08em] py-3.5 rounded-lg hover:shadow-red hover:-translate-y-0.5 transition-all disabled:opacity-50">
            {submitting ? "Criando..." : isLast ? "Criar cadastro" : <>Próximo <ArrowRight className="h-5 w-5" /></>}
          </button>
        </div>
      </form>
    </div>
  );
}
