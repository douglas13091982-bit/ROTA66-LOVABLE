import { type ReactNode, useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Shield, Store, Bike, DollarSign, ClipboardList, LogOut, Menu, Route as RouteIcon, Image as ImageIcon, Wallet, Megaphone, Bell, Smartphone, X, ChevronRight, Users, ScrollText } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@/features/logout/logic/use-logout";
import { useBranding } from "@/hooks/use-branding";
import { useAdminPermissoes, type AdminArea } from "@/hooks/use-admin-permissoes";

const NAV: { to: string; label: string; icon: any; area: AdminArea | null; superOnly?: boolean }[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: Shield, area: null },
  { to: "/admin/lojas", label: "Lojas", icon: Store, area: "lojas" },
  { to: "/admin/entregadores", label: "Entregadores", icon: Bike, area: "entregadores" },
  { to: "/admin/tarifas", label: "Tarifas", icon: DollarSign, area: "tarifas" },
  { to: "/admin/financeiro", label: "Financeiro", icon: Wallet, area: "financeiro" },
  { to: "/admin/creditos-entregador", label: "Créditos entreg.", icon: Wallet, area: "creditos" },
  { to: "/admin/roteirizacao", label: "Roteirização", icon: RouteIcon, area: "roteirizacao" },
  { to: "/admin/notificacao-som", label: "Som de alerta", icon: Bell, area: "notificacao_som" },
  { to: "/admin/branding", label: "Identidade", icon: ImageIcon, area: "branding" },
  { to: "/admin/anuncios", label: "Anúncios", icon: Megaphone, area: "anuncios" },
  { to: "/admin/app-apk", label: "App APK", icon: Smartphone, area: "app_apk" },
  { to: "/admin/pedidos", label: "Pedidos", icon: ClipboardList, area: "pedidos" },
  { to: "/admin/contratos", label: "Contratos", icon: ScrollText, area: null, superOnly: true },
  { to: "/admin/admins", label: "Administradores", icon: Users, area: null, superOnly: true },
];

export function AdminShell({ children, title }: { children: ReactNode; title: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const { signOut: handleSignOut, loading: signingOut } = useLogout();
  const { isSuper, can } = useAdminPermissoes();
  const visibleNav = NAV.filter((n) => {
    if (n.superOnly) return isSuper;
    if (n.area === null) return true;
    return can(n.area);
  });
  const { logoUrl, nomeSistema } = useBranding();
  
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


  const activeItem = visibleNav.find((n) => path.startsWith(n.to));
  const initials = (user?.email ?? "A").slice(0, 1).toUpperCase();

  return (
    <div className="panel-premium flex">
      <aside
        className={`${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:sticky top-0 z-40 w-[260px] h-screen pp-glass-strong border-r flex flex-col transition-transform duration-500`}
        style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between gap-2">
            <Link to="/" className="flex items-center gap-3 group min-w-0">
              <div className="relative shrink-0">
                <img src={logoUrl} alt={nomeSistema} className="h-14 w-14 object-contain transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-tight truncate text-white">{nomeSistema}</div>
                <div className="pp-eyebrow text-[9px] mt-0.5" style={{ color: "var(--rota-gold)" }}>{isSuper ? "Super admin" : "Admin"}</div>
              </div>
            </Link>
            <button onClick={() => setOpen(false)} className="md:hidden text-white/60 hover:text-white" aria-label="Fechar menu">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="h-px mx-5 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <div className="pp-eyebrow px-3 pb-2">Plataforma</div>
          {visibleNav.map((item) => {
            const active = path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`pp-nav ${active ? "pp-nav-active" : ""}`}
              >
                <Icon />
                <span className="flex-1 truncate">{item.label}</span>
                {active && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="h-9 w-9 rounded-full grid place-items-center text-sm font-semibold text-white shrink-0" style={{ background: "linear-gradient(135deg, oklch(0.78 0.16 75), oklch(0.58 0.18 60))", color: "#1a1305" }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-white truncate">Administrador</div>
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

      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="pointer-events-none absolute inset-0 pp-grid-overlay opacity-60" />

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
            <span>Admin</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            <span className="text-white/80 font-medium">{activeItem?.label ?? title}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-white/60 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--rota-gold)", boxShadow: "0 0 0 3px oklch(0.78 0.16 75 / 0.18), 0 0 12px oklch(0.78 0.16 75 / 0.55)" }} />
              Plataforma
            </span>
          </div>
        </header>

        <main className="flex-1 px-5 md:px-8 py-6 md:py-8 relative">
          <div className="pp-reveal">
            {(() => {
              const currentNav = NAV.find((n) => path.startsWith(n.to));
              const blocked = currentNav?.superOnly
                ? !isSuper
                : currentNav?.area
                ? !can(currentNav.area)
                : false;
              if (blocked) {
                return (
                  <div className="max-w-md mx-auto mt-12 text-center pp-card rounded-2xl p-8">
                    <div className="text-lg font-semibold text-white mb-1">Acesso restrito</div>
                    <div className="text-sm text-white/60">
                      Você não tem permissão para acessar esta área. Solicite ao super admin.
                    </div>
                  </div>
                );
              }
              return children;
            })()}
          </div>
        </main>
      </div>
    </div>
  );
}
