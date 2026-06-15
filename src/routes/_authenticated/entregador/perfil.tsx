import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { EntregadorShell } from "@/components/EntregadorShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@/features/logout/logic/use-logout";
import {
  LogOut,
  Camera,
  Image as ImageIcon,
  User,
  Wallet,
  CreditCard,
  Shield,
  HelpCircle,
  Settings,
  ChevronRight,
  BadgeCheck,
  Bike,
  Car,
} from "lucide-react";
import { AvatarImg } from "@/components/AvatarImg";
import { useBranding } from "@/hooks/use-branding";

export const Route = createFileRoute("/_authenticated/entregador/perfil")({
  component: PerfilPage,
});

type SectionKey = "info" | "pagamentos" | "seguranca" | "ajuda" | "config" | null;
type MenuKey = Exclude<SectionKey, null> | "carteira";

function PerfilPage() {
  const { user } = useAuth();
  const { signOut: handleSignOut, loading: sairLoading } = useLogout();
  const navigate = useNavigate();
  
  const { suporteWhatsapp, suporteHorario } = useBranding();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pixChave, setPixChave] = useState("");
  const [aceitaExternos, setAceitaExternos] = useState(false);
  const [tipoVeiculo, setTipoVeiculo] = useState<"moto" | "carro">("moto");
  const [savingVeiculo, setSavingVeiculo] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [savingExternos, setSavingExternos] = useState(false);
  
  const [openSection, setOpenSection] = useState<SectionKey>(null);

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["meu-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, pix_chave, aceita_pedidos_externos, avatar_url, tipo_veiculo")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setPixChave((profile as any).pix_chave ?? "");
      setAceitaExternos(!!(profile as any).aceita_pedidos_externos);
      setAvatarUrl((profile as any).avatar_url ?? null);
      setTipoVeiculo(((profile as any).tipo_veiculo as "moto" | "carro") ?? "moto");
    }
  }, [profile]);

  const { data: stats } = useQuery({
    queryKey: ["perfil-stats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { count } = await supabase
        .from("pedidos")
        .select("id", { count: "exact", head: true })
        .eq("entregador_id", user!.id)
        .eq("status", "entregue");
      return { entregas: count ?? 0 };
    },
  });

  const tempo = useMemo(() => {
    const created = (user as any)?.created_at;
    if (!created) return "—";
    const d = new Date(created);
    const diffMs = Date.now() - d.getTime();
    const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (dias < 30) return `${dias}d`;
    const meses = Math.floor(dias / 30);
    if (meses < 12) return `${meses}m`;
    const anos = Math.floor(meses / 12);
    return `${anos}a`;
  }, [user]);

  const idCurto = useMemo(() => {
    if (!user?.id) return "—";
    const s = user.id.replace(/-/g, "").toUpperCase();
    return `R66-${s.slice(0, 4)}-${s.slice(-1)}`;
  }, [user]);


  const logAvatarEvent = async (
    event: "upload_ok" | "upload_fail" | "rls_denied" | "validation_failed",
    extra: { storage_path?: string; mime_type?: string; size_bytes?: number; error_code?: string; error_message?: string } = {}
  ) => {
    try {
      await supabase.rpc("log_avatar_event" as any, {
        _event: event,
        _storage_path: extra.storage_path ?? null,
        _mime_type: extra.mime_type ?? null,
        _size_bytes: extra.size_bytes ?? null,
        _error_code: extra.error_code ?? null,
        _error_message: extra.error_message ?? null,
        _user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
      });
    } catch {
      // auditoria não pode bloquear a UX
    }
  };

  const handleAvatarUpload = async (file: File | null) => {
    if (!file || !user) return;
    const nameLower = (file.name || "").toLowerCase();
    const extFromName = nameLower.split(".").pop() || "";
    const validExts = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
    const looksImage = file.type.startsWith("image/") || validExts.includes(extFromName);
    if (!looksImage) {
      toast.error("Selecione uma imagem");
      void logAvatarEvent("validation_failed", { mime_type: file.type, size_bytes: file.size, error_code: "invalid_type" });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 3MB)");
      void logAvatarEvent("validation_failed", { mime_type: file.type, size_bytes: file.size, error_code: "too_large" });
      return;
    }
    setUploadingAvatar(true);
    const ext = extFromName || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const contentType = file.type || `image/${ext === "jpg" ? "jpeg" : ext}`;
    try {
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", user.id);
      if (updErr) throw updErr;
      setAvatarUrl(path);
      toast.success("Foto atualizada!");
      void logAvatarEvent("upload_ok", { storage_path: path, mime_type: contentType, size_bytes: file.size });
      refetchProfile();
    } catch (err: any) {
      const status = err?.status ?? err?.statusCode;
      const rawMsg: string = err?.message ?? "";
      const lower = `${err?.error ?? ""} ${rawMsg}`.toLowerCase();
      const isRlsDenied = status === 403 || /row-level security|not authorized|forbidden/i.test(lower);
      let friendly = "Não foi possível enviar sua foto. Tente novamente.";
      if (isRlsDenied) friendly = "Sem permissão para enviar essa foto. Faça login novamente.";
      else if (/network|failed to fetch/i.test(lower)) friendly = "Sem conexão. Tente de novo.";
      toast.error(friendly);
      void logAvatarEvent(isRlsDenied ? "rls_denied" : "upload_fail", {
        storage_path: path, mime_type: contentType, size_bytes: file.size,
        error_code: String(status ?? "unknown"), error_message: rawMsg.slice(0, 300),
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const { data: lojas } = useQuery({
    queryKey: ["minhas-lojas-vinculo", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: vinc } = await supabase.from("loja_entregadores").select("loja_id, ativo").eq("entregador_id", user!.id);
      if (!vinc || vinc.length === 0) return [];
      const ids = vinc.map((v) => v.loja_id);
      const { data: lojas } = await supabase.from("lojas").select("id, nome").in("id", ids);
      return vinc.map((v) => ({ ...v, loja: lojas?.find((l) => l.id === v.loja_id) }));
    },
  });

  const salvar = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone, pix_chave: pixChave || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Perfil atualizado!");
  };

  const toggleExternos = async (novo: boolean) => {
    if (!user) return;
    setSavingExternos(true);
    setAceitaExternos(novo);
    const { error } = await supabase.from("profiles").update({ aceita_pedidos_externos: novo } as any).eq("id", user.id);
    setSavingExternos(false);
    if (error) {
      toast.error(error.message);
      setAceitaExternos(!novo);
    } else {
      toast.success(novo ? "Você passa a receber pedidos abertos" : "Você saiu do pool externo");
      refetchProfile();
    }
  };

  const salvarVeiculo = async (novo: "moto" | "carro") => {
    if (!user || novo === tipoVeiculo) return;
    const anterior = tipoVeiculo;
    setTipoVeiculo(novo);
    setSavingVeiculo(true);
    const { error } = await supabase
      .from("profiles")
      .update({ tipo_veiculo: novo } as any)
      .eq("id", user.id);
    setSavingVeiculo(false);
    if (error) {
      setTipoVeiculo(anterior);
      toast.error(error.message);
    } else {
      toast.success(novo === "carro" ? "Veículo: Carro" : "Veículo: Moto");
      refetchProfile();
    }
  };


  const menu: { key: MenuKey; icon: typeof User; label: string; to?: string }[] = [
    { key: "info", icon: User, label: "Informações Pessoais" },
    { key: "carteira", icon: Wallet, label: "Carteira", to: "/entregador/carteira" },
    { key: "pagamentos", icon: CreditCard, label: "Pagamentos e Ganhos" },
    { key: "seguranca", icon: Shield, label: "Segurança e Senha" },
    { key: "ajuda", icon: HelpCircle, label: "Central de Ajuda" },
    { key: "config", icon: Settings, label: "Configurações do App" },
  ];

  return (
    <EntregadorShell title="Perfil">
      <div className="max-w-md mx-auto pb-4">
        {/* Avatar + identidade */}
        <div className="flex flex-col items-center pt-2 pb-6">
          <div className="relative">
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="h-28 w-28 rounded-3xl overflow-hidden bg-white/[0.04] border border-white/10 flex items-center justify-center disabled:opacity-60"
              aria-label="Trocar foto"
            >
              {avatarUrl ? (
                <AvatarImg src={avatarUrl} alt="Foto" className="h-full w-full object-cover" fallback={<User className="h-10 w-10 text-white/30" />} />
              ) : (
                <User className="h-10 w-10 text-white/30" />
              )}
            </button>
            <div
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full flex items-center justify-center shadow-[0_6px_18px_-6px_oklch(0.55_0.22_27_/_0.7)]"
              style={{ background: "linear-gradient(135deg, oklch(0.72 0.18 27), oklch(0.55 0.22 27))" }}
            >
              <BadgeCheck className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-white tracking-tight text-center">
            {fullName || "Entregador"}
          </h1>
          <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.18em] text-white/45">
            ID: {idCurto}
          </p>

          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { handleAvatarUpload(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          <input ref={galleryInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { handleAvatarUpload(e.target.files?.[0] ?? null); e.target.value = ""; }} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 px-2 pb-4 border-b border-white/8">
          <StatCell value="5.0" label="Avaliação" accent />
          <StatCell value={(stats?.entregas ?? 0).toLocaleString("pt-BR")} label="Pedidos" />
          <StatCell value={tempo} label="Tempo" />
        </div>

        {/* Menu */}
        <div className="mt-2">
          {menu.map((m, idx) => {
            const Icon = m.icon;
            const isOpen = openSection === m.key;
            const isLink = !!m.to;
            return (
              <div key={m.key} className={idx > 0 ? "border-t border-white/8" : ""}>
                {isLink ? (
                  <Link
                    to={m.to!}
                    className="w-full flex items-center gap-4 px-2 py-4 text-left active:bg-white/[0.03] transition-colors"
                  >
                    <Icon className="h-5 w-5 text-white/70 shrink-0" strokeWidth={1.8} />
                    <span className="flex-1 text-[15px] font-semibold text-white">{m.label}</span>
                    <ChevronRight className="h-4 w-4 text-white/40" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setOpenSection(isOpen ? null : (m.key as SectionKey))}
                    className="w-full flex items-center gap-4 px-2 py-4 text-left active:bg-white/[0.03] transition-colors"
                  >
                    <Icon className="h-5 w-5 text-white/70 shrink-0" strokeWidth={1.8} />
                    <span className="flex-1 text-[15px] font-semibold text-white">{m.label}</span>
                    <ChevronRight className={`h-4 w-4 text-white/40 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </button>
                )}
                {isOpen && !isLink && (
                  <div className="px-2 pb-5 -mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                    {m.key === "info" && (
                      <SectionPanel>
                        <Field label="Nome" value={fullName} onChange={setFullName} />
                        <Field label="Telefone" value={phone} onChange={setPhone} />
                        <Field label="E-mail" value={user?.email ?? ""} disabled />
                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.22em] text-white/45 font-bold mb-1.5">
                            Veículo
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              { v: "moto" as const, label: "Moto", Icon: Bike },
                              { v: "carro" as const, label: "Carro", Icon: Car },
                            ]).map(({ v, label, Icon }) => (
                              <button
                                key={v}
                                type="button"
                                onClick={() => salvarVeiculo(v)}
                                disabled={savingVeiculo}
                                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-[13px] font-bold transition ${
                                  tipoVeiculo === v
                                    ? "bg-white/10 border-white/30 text-white"
                                    : "bg-black/30 border-white/10 text-white/55 hover:text-white/85"
                                } disabled:opacity-50`}
                              >
                                <Icon className="h-4 w-4" />
                                {label}
                              </button>
                            ))}
                          </div>
                          <p className="text-[11px] text-white/45 mt-1.5">
                            Carros podem agrupar mais pedidos por rota.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <SmallBtn onClick={() => cameraInputRef.current?.click()} disabled={uploadingAvatar}>
                            <Camera className="h-3.5 w-3.5" /> {uploadingAvatar ? "Enviando..." : "Tirar foto"}
                          </SmallBtn>
                          <SmallBtn onClick={() => galleryInputRef.current?.click()} disabled={uploadingAvatar}>
                            <ImageIcon className="h-3.5 w-3.5" /> Da galeria
                          </SmallBtn>
                        </div>
                        <PrimaryBtn onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</PrimaryBtn>
                      </SectionPanel>
                    )}
                    {m.key === "pagamentos" && (
                      <SectionPanel>
                        <Field
                          label="Chave PIX"
                          value={pixChave}
                          onChange={setPixChave}
                          placeholder="CPF, e-mail, telefone ou chave"
                        />
                        <p className="text-[11px] text-white/45">A loja vê esta chave para te pagar a entrega.</p>
                        <PrimaryBtn onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar chave"}</PrimaryBtn>
                        <button
                          type="button"
                          onClick={() => navigate({ to: "/entregador/historico" })}
                          className="w-full text-center text-[12px] font-bold uppercase tracking-[0.18em] text-white/60 hover:text-white py-2"
                        >
                          Ver histórico de ganhos →
                        </button>
                      </SectionPanel>
                    )}
                    {m.key === "seguranca" && (
                      <SectionPanel>
                        <p className="text-[13px] text-white/65 leading-relaxed">
                          Para trocar sua senha, use a opção <strong>"Esqueci minha senha"</strong> na tela de login.
                        </p>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!user?.email) return;
                            const { error } = await supabase.auth.resetPasswordForEmail(user.email);
                            if (error) toast.error(error.message);
                            else toast.success("Enviamos um link de redefinição para seu e-mail.");
                          }}
                          className="w-full px-4 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[0.18em] bg-white/[0.05] border border-white/10 text-white hover:bg-white/[0.08] transition-colors"
                        >
                          Enviar link de redefinição
                        </button>
                      </SectionPanel>
                    )}
                    {m.key === "ajuda" && (
                      <SectionPanel>
                        {suporteWhatsapp ? (
                          <a
                            href={`https://wa.me/${suporteWhatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center px-4 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[0.18em] bg-white/[0.05] border border-white/10 text-white hover:bg-white/[0.08]"
                          >
                            Falar com o suporte
                          </a>
                        ) : (
                          <p className="text-[12px] text-white/55 text-center px-2 py-3">
                            Canal de suporte ainda não configurado. Aguarde ou contate o administrador.
                          </p>
                        )}
                        {suporteHorario && (
                          <p className="text-[11px] text-white/45 text-center">{suporteHorario}</p>
                        )}
                      </SectionPanel>
                    )}
                    {m.key === "config" && (
                      <SectionPanel>
                        <div className="flex items-start justify-between gap-3 py-1">
                          <div className="flex-1">
                            <p className="text-[13.5px] font-semibold text-white">Entregador externo</p>
                            <p className="text-[11.5px] text-white/55 mt-0.5 leading-snug">
                              Receba pedidos de lojas sem entregador próprio online.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleExternos(!aceitaExternos)}
                            disabled={savingExternos}
                            aria-pressed={aceitaExternos}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                              aceitaExternos ? "bg-emerald-500" : "bg-white/15"
                            } disabled:opacity-50`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${aceitaExternos ? "translate-x-6" : "translate-x-1"}`} />
                          </button>
                        </div>
                        <div className="pt-3 border-t border-white/8">
                          <p className="text-[10px] uppercase tracking-[0.22em] text-white/45 font-bold mb-2">Lojas vinculadas</p>
                          {(!lojas || lojas.length === 0) ? (
                            <p className="text-[12px] text-white/50">Nenhum vínculo ainda.</p>
                          ) : (
                            <ul className="space-y-1.5">
                              {lojas.map((v) => (
                                <li key={v.loja_id} className="flex items-center justify-between text-[13px]">
                                  <span className="text-white/85 font-medium truncate">{v.loja?.nome ?? "—"}</span>
                                  <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] rounded-full ${v.ativo ? "bg-emerald-500/15 text-emerald-400" : "bg-white/8 text-white/50"}`}>
                                    {v.ativo ? "Ativo" : "Inativo"}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </SectionPanel>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div className="border-t border-white/8" />
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={sairLoading}
          className="mt-3 w-full flex items-center gap-4 px-2 py-4 text-left active:bg-white/[0.03] transition-colors disabled:opacity-60"
          style={{ color: "oklch(0.72 0.18 27)" }}
        >
          <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.8} />
          <span className="flex-1 text-[15px] font-bold">{sairLoading ? "Saindo..." : "Encerrar Sessão"}</span>
        </button>

      </div>
    </EntregadorShell>
  );
}

function StatCell({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="text-center py-2">
      <div
        className="text-[26px] font-extrabold leading-none tracking-tight"
        style={accent ? { color: "oklch(0.78 0.16 27)" } : { color: "white" }}
      >
        {value}
      </div>
      <div className="text-[11px] mt-1.5 text-white/55 font-mono">{label}</div>
    </div>
  );
}

function SectionPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/[0.025] border border-white/8 p-4 space-y-3">
      {children}
    </div>
  );
}

function Field({
  label, value, onChange, disabled, placeholder,
}: { label: string; value: string; onChange?: (v: string) => void; disabled?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.22em] text-white/45 font-bold mb-1.5">{label}</label>
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 disabled:text-white/40"
      />
    </div>
  );
}

function SmallBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-[11px] font-bold uppercase tracking-[0.16em] hover:bg-white/[0.08] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function PrimaryBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full px-4 py-3 rounded-xl text-white text-[12px] font-bold uppercase tracking-[0.18em] disabled:opacity-50 active:scale-[0.98] transition-transform"
      style={{
        background: "linear-gradient(135deg, oklch(0.62 0.22 27), oklch(0.52 0.22 27))",
        boxShadow: "0 8px 22px -8px oklch(0.55 0.22 27 / 0.7)",
      }}
    >
      {children}
    </button>
  );
}
