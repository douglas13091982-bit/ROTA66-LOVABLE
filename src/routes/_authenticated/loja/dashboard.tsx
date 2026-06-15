import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LojaShell } from "@/components/LojaShell";
import { useMinhaLoja } from "@/hooks/use-loja";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { isEffectivelyOnline, useOnlineTtlTicker } from "@/lib/entregador-online";
import { ClipboardList, Bike, DollarSign, TrendingUp, Store, AlertCircle, Circle, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/loja/dashboard")({
  component: DashboardPage,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
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

function CriarLojaForm() {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const cnpjDigits = onlyDigits(cnpj);
    if (!cnpjDigits) {
      toast.error("CNPJ é obrigatório");
      return;
    }
    if (!isValidCnpj(cnpjDigits)) {
      toast.error("CNPJ inválido");
      return;
    }
    setSaving(true);

    const baseCatalogo = slugify(nome);
    const makeSuffix = () =>
      globalThis.crypto?.randomUUID?.().replace(/-/g, "").slice(0, 8) ??
      Math.random().toString(36).slice(2, 10).padEnd(8, "0");

    let slug = `${baseCatalogo}-${makeSuffix()}`;
    let catalogo_slug = baseCatalogo;
    let inserted = false;
    let lastError: any = null;

    for (let tentativa = 1; tentativa <= 20; tentativa++) {
      const { error } = await supabase.from("lojas").insert({
        owner_id: user.id,
        nome,
        slug,
        catalogo_slug,
        cnpj: cnpjDigits,
        telefone,
        cidade,
      });
      if (!error) {
        inserted = true;
        break;
      }
      lastError = error;
      const msg = error.message || "";
      // CNPJ duplicado nunca é resolvido por retry — aborta imediatamente.
      if (/cnpj/i.test(msg) && /(duplicate|unique)/i.test(msg)) {
        break;
      }
      if (/duplicate|unique|violates/i.test(msg)) {
        // Regenera tanto slug quanto catalogo_slug para evitar colisão em qualquer um dos dois.
        slug = `${baseCatalogo}-${makeSuffix()}`;
        catalogo_slug = `${baseCatalogo}-${tentativa}`;
      } else {
        break;
      }
    }

    setSaving(false);
    if (!inserted) {
      const msg = /cnpj/i.test(lastError?.message)
        ? lastError.message.includes("duplicate") || lastError.message.includes("unique")
          ? "Este CNPJ já está cadastrado."
          : "CNPJ inválido"
        : lastError?.message || "Erro ao criar loja";
      toast.error("Erro ao criar loja", { description: msg });
    } else {
      toast.success("Loja criada! Recarregando…");
      setTimeout(() => window.location.reload(), 600);
    }
  };

  return (
    <div className="max-w-xl mx-auto pp-card pp-hairline-top rounded-2xl p-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="pp-disc pp-disc-accent h-12 w-12">
          <Store className="h-6 w-6" />
        </div>
        <div>
          <h2 className="pp-title-page text-2xl text-white">Criar sua loja</h2>
          <p className="text-sm text-white/55 mt-0.5">Pegue a estrada da ROTA 66 em poucos passos.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome da loja" value={nome} onChange={setNome} required />
        <Field
          label="CNPJ"
          value={cnpj}
          onChange={(v) => setCnpj(formatCnpj(v))}
          required
          placeholder="00.000.000/0000-00"
          inputMode="numeric"
          maxLength={18}
        />
        <Field label="Telefone" value={telefone} onChange={setTelefone} required />
        <Field label="Cidade" value={cidade} onChange={setCidade} required />
        <button
          disabled={saving}
          className="pp-cta w-full py-3.5 text-sm disabled:opacity-50"
        >
          {saving ? "Criando..." : "Criar loja"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, required, placeholder, inputMode, maxLength }: { label: string; value: string; onChange: (s: string) => void; required?: boolean; placeholder?: string; inputMode?: "numeric" | "tel" | "text" | "email"; maxLength?: number }) {
  return (
    <label className="block">
      <span className="pp-eyebrow block mb-1.5">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/15 transition"
      />
    </label>
  );
}

function StatCard({ icon: Icon, label, value, accent, sub }: { icon: any; label: string; value: string; accent?: boolean; sub?: string }) {
  return (
    <div className="pp-card pp-card-hover rounded-2xl p-5 relative overflow-hidden">
      {accent && (
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, oklch(0.55 0.21 27 / 0.18), transparent 70%)" }} />
      )}
      <div className="flex items-start justify-between mb-6">
        <span className="pp-eyebrow">{label}</span>
        <div className={`pp-disc ${accent ? "pp-disc-accent" : ""}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      <div className="pp-num text-[34px] text-white">{value}</div>
      {sub && <div className="mt-1.5 text-[11px] text-white/45">{sub}</div>}
    </div>
  );
}


function DashboardPage() {
  const { data: loja, isLoading } = useMinhaLoja();

  const { data: stats } = useQuery({
    queryKey: ["loja-stats", loja?.id],
    enabled: !!loja?.id,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: pedidos } = await supabase
        .from("pedidos")
        .select("status, valor_total, created_at, entregador_id")
        .eq("loja_id", loja!.id);
      const list = pedidos ?? [];
      const hoje = list.filter((p) => new Date(p.created_at) >= today);
      const ativos = list.filter((p) => !["entregue", "cancelado"].includes(p.status));
      const faturamentoHoje = hoje
        .filter((p) => p.status === "entregue")
        .reduce((sum, p) => sum + Number(p.valor_total), 0);
      const { count: entregadoresCount } = await supabase
        .from("loja_entregadores")
        .select("*", { count: "exact", head: true })
        .eq("loja_id", loja!.id)
        .eq("ativo", true);
      return {
        pedidosHoje: hoje.length,
        ativos: ativos.length,
        faturamentoHoje,
        entregadores: entregadoresCount ?? 0,
      };
    },
  });

  if (isLoading) {
    return (
      <LojaShell title="Dashboard">
        <div className="pp-card rounded-2xl p-10 grid place-items-center text-white/50 text-sm">
          <span className="inline-flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Carregando dados da loja…
          </span>
        </div>
      </LojaShell>
    );
  }

  if (!loja) {
    return (
      <LojaShell title="Dashboard">
        <CriarLojaForm />
      </LojaShell>
    );
  }

  return (
    <LojaShell title="Dashboard">
      {/* Header da loja */}
      <div className="pp-card pp-hairline-top rounded-2xl p-5 md:p-6 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-14 w-14 rounded-2xl grid place-items-center text-white shrink-0" style={{ background: "linear-gradient(135deg, oklch(0.62 0.22 27), oklch(0.42 0.20 27))", boxShadow: "0 12px 30px -10px oklch(0.55 0.21 27 / 0.6), inset 0 1px 0 oklch(1 0 0 / 0.15)" }}>
            <Store className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="pp-eyebrow">Sua loja</div>
            <h2 className="text-2xl md:text-[26px] font-semibold text-white truncate tracking-tight mt-0.5">{loja.nome}</h2>
            <p className="text-[12.5px] text-white/55 mt-1 flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${loja.ativa ? "pp-dot-online" : "pp-dot-offline"}`} />
              {loja.ativa ? "Aberta agora" : "Fechada"}
            </p>
          </div>
        </div>
        <Link to="/loja/pedidos" className="pp-cta">
          Ver pedidos
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 pp-stagger">
        <StatCard icon={ClipboardList} label="Pedidos hoje" value={String(stats?.pedidosHoje ?? 0)} accent sub="Recebidos nas últimas 24h" />
        <StatCard icon={TrendingUp} label="Em andamento" value={String(stats?.ativos ?? 0)} sub="Aguardando entrega" />
        <StatCard icon={DollarSign} label="Faturamento hoje" value={`R$ ${(stats?.faturamentoHoje ?? 0).toFixed(2)}`} sub="Apenas pedidos entregues" />
        <StatCard icon={Bike} label="Entregadores" value={String(stats?.entregadores ?? 0)} sub="Vinculados à loja" />
      </div>

      <div className="mb-8">
        <EntregadoresLista lojaId={loja.id} />
      </div>

      <CatalogoPublicoCard catalogoSlug={(loja as any).catalogo_slug ?? loja.slug} />
    </LojaShell>
  );
}

function CatalogoPublicoCard({ catalogoSlug }: { catalogoSlug: string }) {
  const path = `/c/${catalogoSlug}`;
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);
  const fullUrl = origin ? `${origin}${path}` : path;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div className="pp-card rounded-2xl p-5 md:p-6 relative overflow-hidden">
      <div className="absolute -bottom-16 -right-16 h-44 w-44 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, oklch(0.78 0.16 75 / 0.10), transparent 70%)" }} />
      <div className="flex items-start gap-4 relative">
        <div className="pp-disc"><AlertCircle className="h-[18px] w-[18px]" /></div>
        <div className="text-sm flex-1 min-w-0">
          <div className="pp-eyebrow mb-1">Seu cardápio público</div>
          <p className="text-white/65 leading-relaxed mb-2">
            Compartilhe este link com seus clientes:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-0 px-3 py-2 bg-white/[0.05] border border-white/10 rounded text-[var(--rota-gold)] font-mono text-[12px] break-all hover:bg-white/[0.08] transition"
              title="Abrir cardápio em nova aba"
            >
              {fullUrl}
            </a>
            <button
              type="button"
              onClick={copiar}
              className="shrink-0 px-3 py-2 rounded bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] text-white text-[11px] font-bold uppercase tracking-wider transition"
            >
              Copiar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}





type EntregadorItem = {
  id: string;
  full_name: string | null;
  phone: string | null;
  online: boolean;
  lat: number | null;
  lng: number | null;
  updated_at: string | null;
};

function EntregadoresLista({ lojaId }: { lojaId: string }) {
  const qc = useQueryClient();
  const { ttlMin, tick } = useOnlineTtlTicker(20_000);

  useEffect(() => {
    const ch = supabase
      .channel(`loja-entregador-status-${lojaId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "entregador_status" },
        () => qc.invalidateQueries({ queryKey: ["loja-entregadores-lista", lojaId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [lojaId, qc]);

  const { data: raw, isLoading } = useQuery({
    queryKey: ["loja-entregadores-lista", lojaId],
    queryFn: async () => {
      const { data: vinc, error: vincError } = await supabase.rpc(
        "listar_entregadores_loja",
        { _loja_id: lojaId }
      );
      if (vincError) throw vincError;
      const ativos = (vinc ?? []).filter((v: any) => v.ativo);
      if (ativos.length === 0) return [] as EntregadorItem[];

      const ids = ativos.map((v: any) => v.entregador_id);

      const { data: statusList } = await supabase
        .from("entregador_status")
        .select("entregador_id, online, lat, lng, updated_at")
        .in("entregador_id", ids);

      const mapStatus = new Map<string, any>();
      for (const s of statusList ?? []) mapStatus.set(s.entregador_id, s);

      const result: EntregadorItem[] = ativos.map((v: any) => {
        const st = mapStatus.get(v.entregador_id);
        return {
          id: v.entregador_id,
          full_name: v.full_name,
          phone: v.phone,
          online: st?.online ?? false,
          lat: st?.lat ?? null,
          lng: st?.lng ?? null,
          updated_at: st?.updated_at ?? null,
        };
      });
      return result;
    },
    refetchInterval: 30_000,
  });

  // Aplica TTL: entregadores sem heartbeat recente viram offline sozinhos.
  const data = (() => {
    void tick;
    const list = (raw ?? []).map((e) => ({
      ...e,
      online: isEffectivelyOnline(e.online, e.updated_at, ttlMin),
    }));
    list.sort((a, b) => Number(b.online) - Number(a.online));
    return list;
  })();


  const onlineCount = (data ?? []).filter((e) => e.online).length;
  const total = (data ?? []).length;

  return (
    <div className="pp-card rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="pp-disc h-9 w-9"><Bike className="h-[16px] w-[16px]" /></div>
          <div className="min-w-0">
            <div className="pp-eyebrow">Tempo real</div>
            <h3 className="text-[15px] font-semibold text-white tracking-tight mt-0.5 truncate">Entregadores vinculados</h3>
          </div>
        </div>
        <span className="text-[11px] font-medium text-white/60 flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/5 tabular-nums">
          <span className="h-1.5 w-1.5 rounded-full pp-dot-online" />
          {onlineCount} / {total} online
        </span>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="text-sm text-white/50 px-2 py-4">Carregando entregadores…</div>
        ) : !data || data.length === 0 ? (
          <div className="text-sm text-white/50 px-2 py-6 text-center">
            Você ainda não vinculou nenhum entregador a essa loja.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.map((e) => (
              <div
                key={e.id}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 border transition-all duration-300 ${
                  e.online
                    ? "bg-emerald-500/[0.06] border-emerald-500/25 hover:border-emerald-500/40"
                    : "bg-white/[0.02] border-white/5 hover:border-white/10"
                }`}
              >
                <div className="relative shrink-0">
                  <div className="h-10 w-10 rounded-full grid place-items-center text-white" style={{ background: "linear-gradient(135deg, oklch(0.62 0.22 27), oklch(0.42 0.20 27))" }}>
                    <Bike className="h-5 w-5" />
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[oklch(0.16_0.015_260)] ${e.online ? "pp-dot-online" : "pp-dot-offline"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[13.5px] text-white truncate tracking-tight">
                    {e.full_name ?? "Entregador"}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-white/55 mt-0.5">
                    <span className={`inline-flex items-center gap-1 ${e.online ? "text-emerald-400" : ""}`}>
                      <Circle className={`h-2 w-2 fill-current ${e.online ? "text-emerald-400" : "text-white/30"}`} />
                      {e.online ? "Online" : "Offline"}
                    </span>
                    {e.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5" />
                        {e.phone}
                      </span>
                    )}
                  </div>
                  {e.online && e.lat != null && e.lng != null && (
                    <div className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" />
                      GPS ativo
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
