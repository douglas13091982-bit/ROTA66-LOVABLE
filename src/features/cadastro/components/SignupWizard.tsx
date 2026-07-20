import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { AuthInput, AuthPasswordInput } from "@/components/AuthCard";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { sanitizeDigits, sanitizeEmail, sanitizeName, sanitizePhone } from "@/lib/sanitize";
import { normalizeBrPhone, onlyDigits } from "@/lib/format/document";
import { isValidCnpj, isValidCpf } from "@/lib/validation/br-documents";
import { useLojaCategorias } from "@/hooks/use-loja-categorias";
import { useCidades } from "@/hooks/use-cidades";
import type { LojaCategoria } from "@/lib/loja-categorias";
import { Bike, Car, Zap } from "lucide-react";
import { PasswordRequirements } from "./PasswordRequirements";
import { passwordMeetsRequirements } from "../logic/password-rules";
import { progressiveFormatCnpj, progressiveFormatCpf } from "../logic/format-progressivo";
import type { Role } from "../logic/roles";
import type { SignupForm } from "../logic/use-signup-form";

type StepDef = {
  key: string;
  title: string;
  render: () => React.ReactNode;
  validate: () => string | null; // null = ok, string = error msg
};

type Props = {
  role: Role;
  form: SignupForm;
  update: <K extends keyof SignupForm>(k: K, v: SignupForm[K]) => void;
  handleAvatarChange: (file: File | null) => void;
  contratoLoading: boolean;
  contratoVersao?: number | null;
  onOpenContrato: () => void;
  submitting: boolean;
  onSubmit: () => void;
};

export function SignupWizard(props: Props) {
  const { role, form, update, handleAvatarChange, contratoLoading, contratoVersao, onOpenContrato, submitting, onSubmit } = props;
  const { categorias } = useLojaCategorias();
  const { cidades, isLoading: loadingCidades } = useCidades();
  const [step, setStep] = useState(0);

  const steps = useMemo<StepDef[]>(() => {
    const nome: StepDef = {
      key: "nome",
      title: role === "loja_admin" ? "Seu nome (responsável)" : "Seu nome completo",
      render: () => (
        <AuthInput
          label="Nome"
          required
          autoFocus
          value={form.fullName}
          onChange={(e) => update("fullName", sanitizeName(e.target.value, 120))}
          maxLength={120}
          autoComplete="name"
        />
      ),
      validate: () => (form.fullName.trim().length < 3 ? "Informe seu nome completo" : null),
    };

    const nomeLoja: StepDef = {
      key: "nomeLoja",
      title: "Qual o nome da sua loja?",
      render: () => (
        <AuthInput
          label="Nome da loja"
          required
          autoFocus
          value={form.nomeLoja}
          onChange={(e) => update("nomeLoja", sanitizeName(e.target.value, 120))}
          placeholder="Ex.: Pizzaria do Zé"
          maxLength={120}
          autoComplete="organization"
        />
      ),
      validate: () => (!form.nomeLoja.trim() ? "Informe o nome da loja" : null),
    };

    const telefone: StepDef = {
      key: "telefone",
      title: "Telefone com DDD",
      render: () => (
        <AuthInput
          label="Telefone"
          type="tel"
          inputMode="tel"
          required
          autoFocus
          value={form.phone}
          onChange={(e) => update("phone", normalizeBrPhone(sanitizePhone(e.target.value, 16)))}
          placeholder="(11) 99999-9999"
          maxLength={20}
          autoComplete="tel"
        />
      ),
      validate: () => {
        const d = normalizeBrPhone(form.phone);
        if (!d) return "Telefone é obrigatório";
        if (d.length < 10 || d.length > 11) return "Telefone inválido (use DDD + número)";
        return null;
      },
    };

    const cpf: StepDef = {
      key: "cpf",
      title: "Seu CPF",
      render: () => (
        <>
          <AuthInput
            label="CPF"
            inputMode="numeric"
            required
            autoFocus
            value={form.cpf}
            onChange={(e) => update("cpf", progressiveFormatCpf(sanitizeDigits(e.target.value, 11)))}
            placeholder="000.000.000-00"
            maxLength={14}
          />
          <p className="text-[11px] text-muted-foreground -mt-3">
            Usado nos pagamentos por Pix e cartão.
          </p>
        </>
      ),
      validate: () => {
        const d = onlyDigits(form.cpf);
        if (!d) return "CPF é obrigatório";
        if (!isValidCpf(d)) return "CPF inválido";
        return null;
      },
    };

    const cnpj: StepDef = {
      key: "cnpj",
      title: "CNPJ da loja",
      render: () => (
        <AuthInput
          label="CNPJ"
          inputMode="numeric"
          required
          autoFocus
          value={form.cnpj}
          onChange={(e) => update("cnpj", progressiveFormatCnpj(sanitizeDigits(e.target.value, 14)))}
          placeholder="00.000.000/0000-00"
          maxLength={18}
        />
      ),
      validate: () => {
        const d = onlyDigits(form.cnpj);
        if (!d) return "CNPJ é obrigatório";
        if (!isValidCnpj(d)) return "CNPJ inválido";
        return null;
      },
    };

    const categoria: StepDef = {
      key: "categoria",
      title: "Categoria da loja",
      render: () => (
        <label className="block">
          <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-2.5">
            Categoria
          </span>
          <select
            required
            autoFocus
            value={form.categoria}
            onChange={(e) => update("categoria", e.target.value as LojaCategoria)}
            className="w-full bg-background/60 border border-border/60 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/25"
          >
            <option value="">Selecione...</option>
            {categorias.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>
      ),
      validate: () => (!form.categoria ? "Selecione a categoria" : null),
    };

    const cidadeLoja: StepDef = {
      key: "cidadeLoja",
      title: "Cidade da loja",
      render: () => (
        <label className="block">
          <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-2.5">
            Cidade
          </span>
          <select
            required
            autoFocus
            value={form.cityId}
            onChange={(e) => update("cityId", e.target.value)}
            disabled={loadingCidades}
            className="w-full bg-background/60 border border-border/60 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/25"
          >
            <option value="">{loadingCidades ? "Carregando..." : "Selecione a cidade"}</option>
            {cidades.map((c) => (
              <option key={c.id} value={c.id}>{c.nome} — {c.uf}</option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground mt-2">
            Define em qual franquia sua loja vai operar.
          </p>
        </label>
      ),
      validate: () => (!form.cityId ? "Selecione a cidade" : null),
    };

    const cidadeEntregador: StepDef = {
      key: "cidadeEntregador",
      title: "Cidade onde vai atuar",
      render: () => (
        <label className="block">
          <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-2.5">
            Cidade
          </span>
          <select
            required
            autoFocus
            value={form.cityId}
            onChange={(e) => update("cityId", e.target.value)}
            disabled={loadingCidades}
            className="w-full bg-background/60 border border-border/60 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/25"
          >
            <option value="">{loadingCidades ? "Carregando..." : "Selecione sua cidade"}</option>
            {cidades.map((c) => (
              <option key={c.id} value={c.id}>{c.nome} — {c.uf}</option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground mt-2">
            O franqueado dessa cidade vai analisar seu cadastro.
          </p>
        </label>
      ),
      validate: () => (!form.cityId ? "Selecione sua cidade" : null),
    };

    const veiculo: StepDef = {
      key: "veiculo",
      title: "Qual seu veículo?",
      render: () => {
        const opts = [
          { value: "moto" as const, label: "Moto", Icon: Bike },
          { value: "carro" as const, label: "Carro", Icon: Car },
          { value: "bike_eletrica" as const, label: "Bike elétrica", Icon: Zap },
        ];
        return (
          <div className="grid grid-cols-3 gap-2">
            {opts.map(({ value, label, Icon }) => {
              const selected = form.tipoVeiculo === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => update("tipoVeiculo", value)}
                  className={`relative p-4 rounded-lg border-2 text-center transition-all ${
                    selected
                      ? "border-primary bg-primary/15 ring-2 ring-primary/40"
                      : "border-border/70 bg-background/40 hover:border-primary/50"
                  }`}
                >
                  {selected && (
                    <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                  <Icon className={`h-7 w-7 mx-auto mb-1 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                  <div className={`font-display text-sm ${selected ? "text-primary font-bold" : "text-foreground"}`}>{label}</div>
                </button>
              );
            })}
          </div>
        );
      },
      validate: () => null,
    };

    const avatar: StepDef = {
      key: "avatar",
      title: "Foto de perfil",
      render: () => (
        <div>
          <div className="flex items-center gap-4">
            <div className={`h-24 w-24 rounded-full border-2 bg-background overflow-hidden flex items-center justify-center text-muted-foreground text-xs shrink-0 ${form.avatarPreview ? "border-border" : "border-destructive"}`}>
              {form.avatarPreview ? (
                <img src={form.avatarPreview} alt="" className="h-full w-full object-cover" />
              ) : "Obrigatória"}
            </div>
            <label className="cursor-pointer px-4 py-2 bg-muted hover:bg-muted/70 rounded-md text-sm font-bold uppercase tracking-wider">
              {form.avatarFile ? "Trocar foto" : "Escolher foto"}
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">Obrigatória. Máx 3MB.</p>
        </div>
      ),
      validate: () => (!form.avatarFile ? "Envie sua foto de perfil" : null),
    };

    const enderecoCliente: StepDef = {
      key: "enderecoCliente",
      title: "Seu endereço",
      render: () => (
        <>
          <AddressAutocomplete
            label="Endereço"
            required
            value={form.endereco}
            onChange={(v) => update("endereco", v.slice(0, 200))}
            onSelect={(s) => {
              update("endereco", s.endereco.slice(0, 200));
              if (s.cidade) update("cidade", s.cidade.slice(0, 80));
              if (s.estado) update("estado", s.estado.slice(0, 2));
            }}
            placeholder="Comece a digitar — buscamos no Google Maps"
          />
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <AuthInput label="Cidade" required value={form.cidade}
              onChange={(e) => update("cidade", e.target.value.slice(0, 80))}
              maxLength={80} autoComplete="address-level2" />
            <AuthInput label="UF" required value={form.estado}
              onChange={(e) => update("estado", e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2))}
              placeholder="SP" maxLength={2} autoComplete="address-level1" />
          </div>
        </>
      ),
      validate: () => {
        if (!form.endereco.trim() || !form.cidade.trim() || !form.estado.trim())
          return "Informe endereço, cidade e estado";
        if (form.estado.trim().length !== 2) return "UF deve ter 2 letras";
        return null;
      },
    };

    const termos: StepDef = {
      key: "termos",
      title: "Termos de uso",
      render: () => (
        <label className="flex items-start gap-3 cursor-pointer select-none rounded-lg border border-border/60 bg-background/40 p-4">
          <input
            type="checkbox"
            checked={form.aceiteContrato}
            onChange={(e) => update("aceiteContrato", e.target.checked)}
            className="mt-0.5 h-5 w-5 accent-primary"
          />
          <span className="text-sm text-foreground/85 leading-snug">
            Li e aceito os{" "}
            <button type="button" onClick={onOpenContrato}
              className="text-primary underline underline-offset-2 font-semibold">
              Termos de Uso
            </button>
            {contratoVersao ? <span className="text-muted-foreground"> (v{contratoVersao})</span> : null}.
          </span>
        </label>
      ),
      validate: () => {
        if (contratoLoading) return "Aguarde carregar os Termos";
        if (!form.aceiteContrato) return "Você precisa aceitar os Termos";
        return null;
      },
    };

    const emailSenha: StepDef = {
      key: "emailSenha",
      title: "E-mail e senha de acesso",
      render: () => (
        <>
          <AuthInput
            label="E-mail"
            type="email"
            inputMode="email"
            required
            autoFocus
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
        </>
      ),
      validate: () => {
        if (!form.email.trim()) return "Informe seu e-mail";
        if (!/^\S+@\S+\.\S+$/.test(form.email)) return "E-mail inválido";
        if (!passwordMeetsRequirements(form.password)) return "A senha não atende aos requisitos";
        return null;
      },
    };

    if (role === "cliente") {
      return [nome, telefone, cpf, enderecoCliente, emailSenha];
    }
    if (role === "entregador") {
      return [nome, telefone, cpf, cidadeEntregador, veiculo, avatar, emailSenha];
    }
    // loja_admin
    return [nome, nomeLoja, telefone, cnpj, categoria, cidadeLoja, termos, emailSenha];
  }, [role, form, update, categorias, cidades, loadingCidades, handleAvatarChange, contratoLoading, contratoVersao, onOpenContrato]);

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  function next() {
    const err = current.validate();
    if (err) {
      toast.error(err);
      return;
    }
    if (isLast) {
      onSubmit();
    } else {
      setStep((s) => s + 1);
    }
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <div className="space-y-5">
      {/* Progresso */}
      <div>
        <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
          <span>Passo {step + 1} de {steps.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-background/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-premium"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Título do passo */}
      <h2 className="font-display text-2xl leading-tight">{current.title}</h2>

      {/* Campo(s) do passo */}
      <form
        onSubmit={(e) => { e.preventDefault(); next(); }}
        className="space-y-4"
      >
        <div key={current.key}>{current.render()}</div>

        <div className="flex items-center gap-3 pt-2">
          {step > 0 && (
            <button
              type="button"
              onClick={back}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-3 rounded-lg border border-border/60 text-sm font-bold uppercase tracking-wider hover:bg-background/60 disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || (isLast && role === "loja_admin" && contratoLoading)}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-red shadow-elevated text-primary-foreground font-display text-lg tracking-[0.08em] py-3.5 rounded-lg hover:shadow-red hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {submitting
              ? "Criando..."
              : isLast
                ? "Criar conta"
                : (<>Próximo <ArrowRight className="h-5 w-5" /></>)}
          </button>
        </div>
      </form>
    </div>
  );
}
