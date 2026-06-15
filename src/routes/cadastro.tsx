import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Store, Bike, Car, Check, X, User, ArrowLeft } from "lucide-react";
import { AuthCard, AuthInput, AuthPasswordInput, PrimaryButton, GoogleButton } from "@/components/AuthCard";
import { sanitizeName, sanitizePhone, sanitizeEmail, sanitizeDigits } from "@/lib/sanitize";
import { LOJA_CATEGORIAS, type LojaCategoria } from "@/lib/loja-categorias";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { useContratoAtivo } from "@/components/ContratoView";
import { ContratoDialog } from "@/components/ContratoDialog";

const PASSWORD_RULES = [
  { key: "length", label: "Pelo menos 8 caracteres", test: (p: string) => p.length >= 8 },
  { key: "upper", label: "Uma letra maiúscula (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
  { key: "lower", label: "Uma letra minúscula (a–z)", test: (p: string) => /[a-z]/.test(p) },
  { key: "number", label: "Um número (0–9)", test: (p: string) => /\d/.test(p) },
  { key: "special", label: "Um caractere especial (!@#$…)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

function PasswordRequirements({ password }: { password: string }) {
  const results = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(password) }));
  const passed = results.filter((r) => r.ok).length;
  const pct = (passed / results.length) * 100;
  const strengthLabel =
    passed <= 1 ? "Muito fraca" : passed === 2 ? "Fraca" : passed === 3 ? "Razoável" : passed === 4 ? "Boa" : "Forte";
  const strengthColor =
    passed <= 1
      ? "bg-destructive"
      : passed === 2
        ? "bg-orange-500"
        : passed === 3
          ? "bg-yellow-500"
          : passed === 4
            ? "bg-lime-500"
            : "bg-emerald-500";

  return (
    <div className="-mt-3 mb-5 rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Força da senha</span>
        <span className={`text-[11px] font-bold ${passed >= 4 ? "text-emerald-400" : "text-muted-foreground"}`}>
          {strengthLabel}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-border/40 overflow-hidden mb-3">
        <div
          className={`h-full ${strengthColor} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-1.5">
        {results.map((r) => (
          <li
            key={r.key}
            className={`flex items-center gap-2 text-xs transition-colors duration-200 ${
              r.ok ? "text-emerald-400" : "text-muted-foreground"
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                r.ok ? "border-emerald-400/60 bg-emerald-400/15" : "border-border/70 bg-background/40"
              }`}
            >
              {r.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3 opacity-50" />}
            </span>
            <span>{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function passwordMeetsRequirements(p: string) {
  return PASSWORD_RULES.every((r) => r.test(p));
}

type Role = "loja_admin" | "entregador" | "cliente";

export const Route = createFileRoute("/cadastro")({
  head: () => ({ meta: [{ title: "Cadastro — ROTA 66" }] }),
  component: SignupPage,
});

const ROLE_OPTIONS: { value: Role; label: string; Icon: typeof Store; desc: string }[] = [
  { value: "loja_admin", label: "Loja", Icon: Store, desc: "Restaurante, mercado ou loja" },
  { value: "entregador", label: "Entregador", Icon: Bike, desc: "Moto, carro ou caminhonete" },
  { value: "cliente", label: "Cliente", Icon: User, desc: "Comprar em lojas e restaurantes" },
];

function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

function formatCpf(s: string) {
  const d = onlyDigits(s).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function isValidCpf(raw: string): boolean {
  const s = onlyDigits(raw);
  if (s.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(s[i], 10) * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  if (d1 !== parseInt(s[9], 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(s[i], 10) * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  return d2 === parseInt(s[10], 10);
}

function formatCnpj(s: string) {
  const d = onlyDigits(s).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function isValidCnpj(raw: string): boolean {
  const s = onlyDigits(raw);
  if (s.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(s)) return false;
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(s[i], 10) * w1[i];
  let d1 = sum % 11;
  d1 = d1 < 2 ? 0 : 11 - d1;
  if (d1 !== parseInt(s[12], 10)) return false;
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(s[i], 10) * w2[i];
  let d2 = sum % 11;
  d2 = d2 < 2 ? 0 : 11 - d2;
  return d2 === parseInt(s[13], 10);
}

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"select" | "form">("select");
  const [role, setRole] = useState<Role | null>(null);
  const [tipoVeiculo, setTipoVeiculo] = useState<"moto" | "carro">("moto");
  const [fullName, setFullName] = useState("");
  const [nomeLoja, setNomeLoja] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [categoria, setCategoria] = useState<LojaCategoria | "">("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aceiteContrato, setAceiteContrato] = useState(false);
  const [contratoModalOpen, setContratoModalOpen] = useState(false);
  const { contrato: contratoAtivo, loading: contratoLoading } = useContratoAtivo();


  const handleAvatarChange = (file: File | null) => {
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 3MB)");
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    if (!passwordMeetsRequirements(password)) {
      toast.error("A senha não atende a todos os requisitos");
      return;
    }
    const cpfDigits = onlyDigits(cpf);
    const cnpjDigits = onlyDigits(cnpj);
    if (role === "entregador") {
      if (!cpfDigits) {
        toast.error("CPF é obrigatório para entregadores");
        return;
      }
      if (!isValidCpf(cpfDigits)) {
        toast.error("CPF inválido");
        return;
      }
      if (!avatarFile) {
        toast.error("A foto de perfil é obrigatória para entregadores");
        return;
      }
    } else if (role === "loja_admin") {
      if (!nomeLoja.trim()) {
        toast.error("Informe o nome da loja");
        return;
      }
      if (!cnpjDigits) {
        toast.error("CNPJ é obrigatório para lojas");
        return;
      }
      if (!isValidCnpj(cnpjDigits)) {
        toast.error("CNPJ inválido");
        return;
      }
      if (!categoria) {
        toast.error("Selecione a categoria de atuação da loja");
        return;
      }
      if (!aceiteContrato) {
        toast.error("Você precisa aceitar os Termos de Uso para continuar");
        return;
      }
      if (contratoLoading || !contratoAtivo?.id) {
        toast.error("Aguarde o carregamento dos Termos de Uso e tente novamente.");
        return;
      }
      if (cpfDigits && !isValidCpf(cpfDigits)) {
        toast.error("CPF inválido");
        return;
      }
    } else if (role === "cliente") {
      if (!endereco.trim() || !cidade.trim() || !estado.trim()) {
        toast.error("Informe endereço, cidade e estado para continuar.");
        return;
      }
      if (estado.trim().length !== 2) {
        toast.error("Use a sigla do estado com 2 letras (ex.: SP).");
        return;
      }
    }
    setLoading(true);

    // Pré-checa disponibilidade do CPF antes do signUp, pois o erro do
    // trigger é encapsulado pelo Auth como "Database error saving new user".
    if (cpfDigits) {
      const { data: disponivel, error: cpfErr } = await supabase.rpc("cpf_disponivel", {
        _cpf: cpfDigits,
      });
      if (cpfErr) {
        setLoading(false);
        toast.error("Não foi possível validar o CPF. Tente novamente.");
        return;
      }
      if (!disponivel) {
        setLoading(false);
        toast.error("Este CPF já está cadastrado.");
        return;
      }
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
          phone,
          role,
          cpf: cpfDigits || undefined,
          tipo_veiculo: role === "entregador" ? tipoVeiculo : undefined,
          endereco: role === "cliente" ? endereco.trim() : undefined,
          cidade: role === "cliente" ? cidade.trim() : undefined,
          estado: role === "cliente" ? estado.trim().toUpperCase() : undefined,
        },
      },
    });
    if (error) {
      setLoading(false);
      const msg = /cpf/i.test(error.message)
        ? error.message.includes("já existe") || error.message.includes("já está cadastrado")
          ? "Este CPF já está cadastrado."
          : "CPF inválido"
        : /database error saving new user/i.test(error.message) && cpfDigits
          ? "Este CPF já está cadastrado."
          : error.message;
      toast.error(msg);
      return;
    }



    // Upload da foto (somente entregador, e somente se já tiver sessão ativa)
    if (role === "entregador" && avatarFile && signUpData.session?.user) {
      try {
        const uid = signUpData.session.user.id;
        const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${uid}/avatar-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (upErr) throw upErr;
        await supabase.from("profiles").update({ avatar_url: path }).eq("id", uid);
      } catch (err: any) {
        toast.error("Conta criada, mas não foi possível enviar a foto: " + (err.message ?? "erro"));
      }
    }

    setLoading(false);

    // Garante sessão ativa (sem verificação de e-mail)
    let session = signUpData.session;
    if (!session) {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      session = signInData.session ?? null;
      if (signInErr || !session) {
        // Sem sessão (provavelmente confirmação de e-mail obrigatória).
        // NÃO redireciona para áreas internas — orienta o usuário a confirmar o e-mail.
        toast.success("Conta criada! Confirme seu e-mail para concluir o cadastro.");
        if (role === "loja_admin") {
          toast.message(
            "Após confirmar o e-mail, faça login para registrar os dados da sua loja.",
          );
        }
        return navigate({ to: "/login" });
      }
    }

    // Cria a loja automaticamente com o CNPJ informado
    if (role === "loja_admin" && session?.user) {
      const uid = session.user.id;
      const baseSlug =
        nomeLoja
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 60) || "loja";
      // Sufixo longo (8 chars) reduz drasticamente a chance de colisão de slug.
      const randomSuffix = (
        globalThis.crypto?.randomUUID?.().replace(/-/g, "").slice(0, 8) ??
        Math.random().toString(36).slice(2, 10).padEnd(8, "0")
      );
      const slug = `${baseSlug}-${randomSuffix}`;
      const { data: lojaInserida, error: lojaErr } = await supabase
        .from("lojas")
        .insert({
          owner_id: uid,
          nome: nomeLoja.trim(),
          slug,
          cnpj: cnpjDigits,
          telefone: phone,
          categoria: categoria || null,
        } as any)
        .select("id")
        .single();
      if (lojaErr || !lojaInserida?.id) {
        const rawMsg = lojaErr?.message ?? "";
        const msg = /slug/i.test(rawMsg)
          ? "Não foi possível gerar um identificador único para a loja. Tente novamente."
          : /cnpj/i.test(rawMsg)
            ? rawMsg.includes("duplicate") || rawMsg.includes("unique")
              ? "Este CNPJ já está cadastrado."
              : "CNPJ inválido"
            : rawMsg || "erro desconhecido";
        toast.error("Conta criada, mas não foi possível registrar a loja: " + msg);
        // NÃO redireciona — usuário permanece no formulário para corrigir e tentar novamente.
        return;
      }

      // Registra o aceite do contrato. Se falhar, avisa e mantém o usuário no fluxo.
      if (contratoAtivo?.id) {
        const { error: aceiteErr } = await supabase.from("loja_aceites_contrato").insert({
          loja_id: lojaInserida.id,
          contrato_id: contratoAtivo.id,
          versao: contratoAtivo.versao,
          user_agent: navigator.userAgent.slice(0, 500),
          full_name_snapshot: fullName,
        });
        if (aceiteErr) {
          toast.error(
            "Loja criada, mas o registro do aceite dos Termos falhou. Acesse o painel para refazer o aceite.",
          );
        }
      }

      toast.success("Loja criada com sucesso!");
      return navigate({ to: "/loja" });
    }

    toast.success("Conta criada com sucesso!");
    if (role === "cliente") {
      return navigate({
        to: "/clientes/$cidade",
        params: { cidade: encodeURIComponent(cidade.trim()) },
        search: { uf: estado.trim().toUpperCase() },
      });
    }
    return navigate({ to: "/baixar-app" });
  };


  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com Google");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
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
        <div className="space-y-4">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">
            Quero me cadastrar como
          </div>
          <div className="grid grid-cols-1 gap-3">
            {ROLE_OPTIONS.map(({ value, label, Icon, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setRole(value);
                  setStep("form");
                }}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/60 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="font-display text-base font-bold tracking-wide">{label}</div>
                  <div className="text-sm text-muted-foreground">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
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

          <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background/40">
            {(() => {
              const opt = ROLE_OPTIONS.find((o) => o.value === role);
              if (!opt) return null;
              const { Icon, label, desc } = opt;
              return (
                <>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-display text-sm font-bold tracking-wide">{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                </>
              );
            })()}
          </div>

          <form onSubmit={handleSubmit}>
            <AuthInput
              label={role === "loja_admin" ? "Nome do responsável" : "Nome completo"}
              required
              value={fullName}
              onChange={(e) => setFullName(sanitizeName(e.target.value, 120))}
              maxLength={120}
              autoComplete="name"
            />
            {role === "loja_admin" && (
              <AuthInput
                label="Nome da loja"
                required
                value={nomeLoja}
                onChange={(e) => setNomeLoja(sanitizeName(e.target.value, 120))}
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
              value={phone}
              onChange={(e) => setPhone(sanitizePhone(e.target.value, 16))}
              placeholder="(11) 99999-9999"
              maxLength={20}
              autoComplete="tel"
            />
            {role === "loja_admin" && (
              <>
                <AuthInput
                  label="CNPJ"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9./\-]*"
                  required
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCnpj(sanitizeDigits(e.target.value, 14)))}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
                <label className="block mb-5">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-2.5">
                    Categoria de atuação
                  </span>
                  <select
                    required
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as LojaCategoria)}
                    className="w-full bg-background/60 border border-border/60 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/25 transition-all duration-300 ease-premium"
                  >
                    <option value="">Selecione...</option>
                    {LOJA_CATEGORIAS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-start gap-3 mb-5 cursor-pointer select-none rounded-lg border border-border/60 bg-background/40 p-3">
                  <input
                    type="checkbox"
                    checked={aceiteContrato}
                    onChange={(e) => setAceiteContrato(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <span className="text-[12.5px] text-foreground/85 leading-snug">
                    Li e aceito os{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setContratoModalOpen(true);
                      }}
                      className="text-primary underline underline-offset-2 font-semibold"
                    >
                      Termos de Uso
                    </button>
                    {contratoAtivo ? (
                      <span className="text-muted-foreground"> (v{contratoAtivo.versao})</span>
                    ) : null}
                    .
                  </span>
                </label>
              </>
            )}
            {role === "entregador" && (
              <>
                <AuthInput
                  label="CPF"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9.\-]*"
                  required
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(sanitizeDigits(e.target.value, 11)))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
                <div className="mb-4">
                  <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Tipo de veículo <span className="text-destructive">*</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: "moto", label: "Moto", Icon: Bike, desc: "Entregas rápidas" },
                      { value: "carro", label: "Carro", Icon: Car, desc: "Mais pedidos por rota" },
                    ] as const).map(({ value, label, Icon, desc }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTipoVeiculo(value)}
                        className={`p-3 rounded-md border-2 text-center transition-all ${
                          tipoVeiculo === value
                            ? "border-primary bg-primary/10 shadow-red"
                            : "border-border hover:border-primary/50"
                        }`}
                        title={desc}
                      >
                        <Icon className={`h-6 w-6 mx-auto mb-1 ${tipoVeiculo === value ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="font-display text-sm tracking-wide">{label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            {role === "cliente" && (
              <>
                <AddressAutocomplete
                  label="Endereço"
                  required
                  value={endereco}
                  onChange={(v) => setEndereco(v.slice(0, 200))}
                  onSelect={(s) => {
                    setEndereco(s.endereco.slice(0, 200));
                    if (s.cidade) setCidade(s.cidade.slice(0, 80));
                    if (s.estado) setEstado(s.estado.slice(0, 2));
                  }}
                  placeholder="Comece a digitar — buscamos no Google Maps"
                />
                <div className="grid grid-cols-[1fr_120px] gap-3">
                  <AuthInput
                    label="Cidade"
                    required
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value.slice(0, 80))}
                    placeholder="Preenchida ao escolher o endereço"
                    maxLength={80}
                    autoComplete="address-level2"
                  />
                  <AuthInput
                    label="UF"
                    required
                    value={estado}
                    onChange={(e) => setEstado(e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2))}
                    placeholder="SP"
                    maxLength={2}
                    autoComplete="address-level1"
                  />
                </div>
              </>
            )}



            <AuthInput
              label="E-mail"
              type="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(sanitizeEmail(e.target.value))}
              maxLength={254}
              autoComplete="email"
            />
            <AuthPasswordInput
              label="Senha"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              placeholder="Crie uma senha forte"
            />
            <PasswordRequirements password={password} />
            {role === "entregador" && (
              <div className="mb-4">
                <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  Foto de perfil <span className="text-destructive">*</span>
                </span>
                <div className="flex items-center gap-4">
                  <div className={`h-20 w-20 rounded-full border-2 bg-background overflow-hidden flex items-center justify-center text-muted-foreground text-xs shrink-0 ${avatarPreview ? "border-border" : "border-destructive"}`}>
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Pré-visualização" className="h-full w-full object-cover" />
                    ) : (
                      "Obrigatória"
                    )}
                  </div>
                  <label className="cursor-pointer px-4 py-2 bg-muted hover:bg-muted/70 rounded-md text-sm font-bold uppercase tracking-wider">
                    {avatarFile ? "Trocar" : "Escolher foto"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Obrigatória para entregadores. Máx 3MB.
                </p>
              </div>
            )}
            <PrimaryButton type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar conta"}
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
