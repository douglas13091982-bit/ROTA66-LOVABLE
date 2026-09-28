import { type ReactNode, useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Shield, Bike, MapPin, DollarSign, LifeBuoy, LogOut, Menu, X, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@/features/logout/logic/use-logout";
import { useBranding } from "@/hooks/use-branding";
import { useDocsEntregadorPendentesCount } from "@/features/admin-entregadores/hooks/use-docs-pendentes-count";
import { useSuporteBadge } from "@/features/suporte/hooks/use-suporte";

const NAV = [
  { to: "/admin/dashboard", label: "Visão geral", icon: Shield },
  { to: "/admin/entregadores", label: "Entregadores", icon: Bike },
  { to: "/admin/mapa", label: "Mapa de entregadores", icon: MapPin },
  { to: "/admin/tarifas", label: "Tarifas de entrega", icon: DollarSign },
  { to: "/admin/suporte", label: "Suporte", icon: LifeBuoy },
] as const;

export function AdminShell({ children, title }: { children: ReactNode; title: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const { signOut, loading: signingOut } = useLogout();
  const { logoUrl, nomeSistema } = useBranding();
  const { data: docsPendentes = 0 } = useDocsEntregadorPendentesCount();
  const suporteBadge = useSuporteBadge("admin");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const activeItem = NAV.find((item) => path.startsWith(item.to));
  const initials = (user?.email ?? "A").slice(0, 1).toUpperCase();

  return (
    <div className="panel-premium panel-light flex min-h-screen">
      <aside
        className={`${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:sticky top-0 z-40 w-[260px] h-screen pp-glass-strong border-r flex flex-col transition-transform duration-300`}
      >
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between gap-2">
            <Link to="/" className="flex items-center gap-3 min-w-0">
              <img src={logoUrl} alt={nomeSistema} className="h-14 w-14 object-contain" />
              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-tight truncate text-white">ROTA 66</div>
                <div className="pp-eyebrow text-[9px] mt-0.5" style={{ color: "var(--rota-gold)" }}>CENTRAL LOGÍSTICA</div>
              </div>
            </Link>
            <button onClick={() => setOpen(false)} className="md:hidden text-white/60" aria-label="Fechar menu"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="h-px mx-5 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="pp-eyebrow px-3 pb-2">Operação</div>
          {NAV.map((item) => {
            const active = path.startsWith(item.to);
            const Icon = item.icon;
            const badge = item.to === "/admin/entregadores" ? docsPendentes : item.to === "/admin/suporte" ? suporteBadge : 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`pp-nav ${active ? "pp-nav-active" : ""}`}
              >
                <Icon />
                <span className="flex-1 truncate">{item.label}</span>
                {badge > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-red text-white text-[10px] font-bold flex items-center justify-center">{badge > 9 ? "9+" : badge}</span>}
                {active && badge === 0 && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="h-9 w-9 rounded-full grid place-items-center text-sm font-semibold text-white shrink-0" style={{ background: "var(--rota-gold)", color: "#1a1305" }}>{initials}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-white truncate">Administrador</div>
              <div className="text-[10.5px] text-white/50 truncate">{user?.email}</div>
            </div>
            <button onClick={signOut} disabled={signingOut} className="h-8 w-8 grid place-items-center rounded-lg text-white/60 hover:text-white hover:bg-white/5" aria-label="Sair"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </aside>

      {open && <div className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-30" onClick={() => setOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className={`h-16 sticky top-0 z-20 flex items-center px-5 md:px-8 gap-3 border-b ${scrolled ? "pp-glass-strong border-white/8" : "border-transparent bg-transparent"}`}>
          <button className="md:hidden h-9 w-9 grid place-items-center rounded-lg text-white/70" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu className="h-5 w-5" /></button>
          <div className="flex items-center gap-2 text-white/40 text-[12px]">
            <span>Logística</span><ChevronRight className="h-3.5 w-3.5 opacity-50" />
            <span className="text-white/80 font-medium">{activeItem?.label ?? title}</span>
          </div>
        </header>
        <main className="flex-1 px-5 md:px-8 py-6 md:py-8 relative">
          <div className="pp-reveal">{children}</div>
        </main>
      </div>
    </div>
  );
}
