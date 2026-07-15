import { type ReactNode, useEffect, useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, ClipboardList, Users, Settings, LogOut, Menu, PlusCircle, Wallet, X, Package, CalendarClock, ChevronRight, LifeBuoy, Store, History, ShieldCheck, GraduationCap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@/features/logout/logic/use-logout";
import { useBranding } from "@/hooks/use-branding";
import { useMinhaLoja, useIsLojaOwner } from "@/hooks/use-loja";
import { useLojaSuporteId, clearLojaSuporteId } from "@/hooks/use-loja-suporte";
import { supabase } from "@/integrations/supabase/client";
import { AceiteContratoGate } from "@/components/AceiteContratoGate";
import { useChatNaoLidasGlobal } from "@/hooks/use-chat-nao-lidas";
import { useSuporteBadge } from "@/features/suporte/hooks/use-suporte";
import { usePedidosRealtime } from "@/features/loja-pedidos/hooks/use-pedidos-loja";
import { MensalidadeVencimentoBanner } from "@/components/MensalidadeVencimentoBanner";


const NAV_ALL = [
  { to: "/loja/dashboard", label: "Dashboard", icon: LayoutDashboard, ownerOnly: false },
  { to: "/loja/pedidos", label: "Pedidos", icon: ClipboardList, ownerOnly: false },
  { to: "/loja/historico", label: "Histórico", icon: History, ownerOnly: false },
  { to: "/loja/novo-pedido", label: "Novo pedido", icon: PlusCircle, ownerOnly: false },
  { to: "/loja/agendamentos", label: "Agendamentos", icon: CalendarClock, ownerOnly: false },
  { to: "/loja/produtos", label: "Catálogo", icon: Package, ownerOnly: false },
  { to: "/loja/entregadores", label: "Entregadores", icon: Users, ownerOnly: false },
  { to: "/loja/financeiro", label: "Financeiro", icon: Wallet, ownerOnly: true },
  { to: "/loja/funcionarios", label: "Funcionários", icon: Users, ownerOnly: true },
  { to: "/loja/suporte", label: "Suporte", icon: LifeBuoy, ownerOnly: false },
  { to: "/loja/treinamento", label: "Treinamento", icon: GraduationCap, ownerOnly: false },
  { to: "/loja/configuracoes", label: "Configurações", icon: Settings, ownerOnly: false },
] as const;

export function LojaShell({ children, title }: { children: ReactNode; title: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const { signOut: handleSignOut, loading: signingOut } = useLogout();
  const { logoUrl, nomeSistema } = useBranding();
  const { data: loja } = useMinhaLoja();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const suporteLojaId = useLojaSuporteId();
  const modoSuporte = !!suporteLojaId && loja?.id === suporteLojaId;
  useChatNaoLidasGlobal();
  const suporteBadge = useSuporteBadge("loja", loja?.id);
  usePedidosRealtime(loja?.id);
  const isOwner = useIsLojaOwner(loja);
  const NAV = NAV_ALL.filter((n) => !n.ownerOnly || isOwner);

  const sairModoSuporte = () => {
    clearLojaSuporteId();
    qc.invalidateQueries({ queryKey: ["minha-loja"] });
    navigate({ to: "/admin/lojas" });
  };

  
  
  
  
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [togglingAtiva, setTogglingAtiva] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


  const handleToggleAtiva = async () => {
    if (!loja || togglingAtiva) return;
    const novo = !loja.ativa;
    setTogglingAtiva(true);
    // Se fechar manualmente, marca a flag para o cron não reabrir automaticamente.
    // Se abrir manualmente, limpa a flag (volta a respeitar horário automático).
    const { error } = await supabase
      .from("lojas")
      .update({ ativa: novo, fechado_manualmente: !novo } as any)
      .eq("id", loja.id);
    setTogglingAtiva(false);
    if (error) {
      toast.error("Não foi possível atualizar", { description: error.message });
      return;
    }
    qc.invalidateQueries({ queryKey: ["minha-loja", user?.id] });
    toast.success(novo ? "Loja aberta — recebendo pedidos" : "Loja fechada");
  };

  const activeItem = NAV.find((n) => path.startsWith(n.to));
  const initials = (user?.email ?? "L").slice(0, 1).toUpperCase();

  return (
    <div className="panel-premium flex">
      {/* Sidebar */}
      <aside
        className={`${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:sticky top-0 z-40 w-[260px] h-screen pp-glass-strong border-r flex flex-col transition-transform duration-500`}
        style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        {/* Brand */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between gap-2">
            <Link to="/" className="flex items-center gap-3 group min-w-0">
              <div className="relative shrink-0">
                <img src={logoUrl} alt={nomeSistema} className="h-14 w-14 object-contain transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-tight truncate text-white">{nomeSistema}</div>
                <div className="pp-eyebrow text-[9px] mt-0.5">Painel da loja</div>
              </div>
            </Link>
            <button onClick={() => setOpen(false)} className="md:hidden text-white/60 hover:text-white" aria-label="Fechar menu">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="h-px mx-5 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <div className="pp-eyebrow px-3 pb-2">Operação</div>
          {NAV.map((item) => {
            const active = path.startsWith(item.to);
            const Icon = item.icon;
            const badge = item.to === "/loja/suporte" ? suporteBadge : 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`pp-nav ${active ? "pp-nav-active" : ""}`}
              >
                <Icon />
                <span className="flex-1 truncate">{item.label}</span>
                {badge > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-red text-white text-[10px] font-bold flex items-center justify-center">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
                {active && badge === 0 && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-white/5 space-y-2">
          {loja && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-bold uppercase tracking-wider text-white">Loja Aberta</div>
                <div className="text-[10.5px] text-white/50 truncate">Receber novos pedidos do cardápio</div>
              </div>
              <button
                type="button"
                onClick={handleToggleAtiva}
                disabled={togglingAtiva}
                aria-pressed={loja.ativa}
                aria-label={loja.ativa ? "Fechar loja" : "Abrir loja"}
                className={`relative shrink-0 w-12 h-6 rounded-full transition-colors disabled:opacity-60 ${loja.ativa ? "bg-gradient-red shadow-red" : "bg-white/15"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 bg-white rounded-full transition-all ${loja.ativa ? "left-[calc(100%-1.375rem)]" : "left-0.5"}`}
                />
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="h-9 w-9 rounded-full grid place-items-center text-sm font-semibold text-white shrink-0" style={{ background: "linear-gradient(135deg, oklch(0.62 0.22 27), oklch(0.42 0.20 27))" }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-white truncate">Conta</div>
              <div className="text-[10.5px] text-white/50 truncate">{user?.email}</div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="h-8 w-8 grid place-items-center rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition disabled:opacity-50"
              aria-label="Sair"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-30 animate-in fade-in duration-300"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="pointer-events-none absolute inset-0 pp-grid-overlay opacity-60" />

        {modoSuporte && (
          <div className="sticky top-0 z-30 flex items-center gap-3 px-5 md:px-8 py-2.5 bg-amber-500/15 border-b border-amber-500/40 text-amber-100 text-xs">
            <ShieldCheck className="h-4 w-4 shrink-0 text-amber-300" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold">Modo suporte:</span>{" "}
              <span className="opacity-90">
                você está acessando <strong className="text-white">{loja?.nome ?? "loja"}</strong> como administrador. Alterações em financeiro/saques não são permitidas.
              </span>
            </div>
            <button
              type="button"
              onClick={sairModoSuporte}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-50 font-semibold uppercase tracking-wider text-[10px] transition"
            >
              Sair do modo suporte
            </button>
          </div>
        )}
        <MensalidadeVencimentoBanner />



        <header
          className={`h-16 sticky top-0 z-20 flex items-center px-5 md:px-8 gap-3 transition-all duration-300 border-b ${
            scrolled
              ? "pp-glass-strong border-white/8 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.7)]"
              : "border-transparent bg-transparent"
          }`}
        >
          <button
            className="md:hidden h-9 w-9 grid place-items-center rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 text-white/40 text-[12px]">
            <span>Loja</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            <span className="text-white/80 font-medium">{activeItem?.label ?? title}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/loja/suporte"
              className="relative inline-flex items-center gap-1.5 text-[12px] font-medium text-white/80 hover:text-white px-2.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition"
              aria-label="Suporte"
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Suporte</span>
              {suporteBadge > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-gradient-red text-white text-[10px] font-bold leading-none">
                  {suporteBadge > 9 ? "9+" : suporteBadge}
                </span>
              )}
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-white/60 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/5">
              <span className="h-1.5 w-1.5 rounded-full pp-dot-online" />
              Ao vivo
            </span>
          </div>

        </header>

        <main className="flex-1 px-5 md:px-8 py-6 md:py-8 relative">
          <div className="pp-reveal">{children}</div>
        </main>
      </div>
      <AceiteContratoGate />
    </div>
  );
}
