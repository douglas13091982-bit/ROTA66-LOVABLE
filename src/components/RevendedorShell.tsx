import { type ReactNode, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Store, User, LogOut, Menu, X, ChevronRight, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@/features/logout/logic/use-logout";
import { useBranding } from "@/hooks/use-branding";

const NAV = [
  { to: "/revendedor/lojas", label: "Minhas Lojas", icon: Store },
  { to: "/revendedor/ganhos", label: "Meus Ganhos", icon: TrendingUp },
  { to: "/revendedor/perfil", label: "Perfil", icon: User },
];

export function RevendedorShell({ children, title }: { children: ReactNode; title: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const { signOut, loading } = useLogout();
  const { logoUrl, nomeSistema } = useBranding();
  const [open, setOpen] = useState(false);

  const activeItem = NAV.find((n) => path.startsWith(n.to));
  const initials = (user?.email ?? "R").slice(0, 1).toUpperCase();

  return (
    <div className="panel-premium flex">
      <aside
        className={`${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:sticky top-0 z-40 w-[260px] h-screen pp-glass-strong border-r flex flex-col transition-transform duration-500`}
      >
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-center justify-between gap-2">
            <Link to="/" className="flex items-center gap-3 min-w-0">
              <img src={logoUrl} alt={nomeSistema} className="h-14 w-14 object-contain" />
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-white truncate">{nomeSistema}</div>
                <div className="pp-eyebrow text-[9px] mt-0.5" style={{ color: "var(--rota-gold)" }}>Revendedor</div>
              </div>
            </Link>
            <button onClick={() => setOpen(false)} className="md:hidden text-white/60" aria-label="Fechar">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="h-px mx-5 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <div className="pp-eyebrow px-3 pb-2">Painel</div>
          {NAV.map((item) => {
            const active = path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} onClick={() => setOpen(false)} className={`pp-nav ${active ? "pp-nav-active" : ""}`}>
                <Icon />
                <span className="flex-1 truncate">{item.label}</span>
                {active && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-2 py-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="h-9 w-9 rounded-full grid place-items-center text-sm font-semibold shrink-0" style={{ background: "linear-gradient(135deg, oklch(0.78 0.16 75), oklch(0.58 0.18 60))", color: "#1a1305" }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-white truncate">Revendedor</div>
              <div className="text-[10.5px] text-white/50 truncate">{user?.email}</div>
            </div>
            <button onClick={signOut} disabled={loading} className="h-8 w-8 grid place-items-center rounded-lg text-white/60 hover:text-white hover:bg-white/5" aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {open && <div className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-30" onClick={() => setOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 sticky top-0 z-20 flex items-center px-5 md:px-8 gap-3 border-b border-white/8 pp-glass-strong">
          <button className="md:hidden h-9 w-9 grid place-items-center rounded-lg text-white/70" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 text-white/40 text-[12px]">
            <span>Revendedor</span>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            <span className="text-white/80 font-medium">{activeItem?.label ?? title}</span>
          </div>
        </header>
        <main className="flex-1 px-5 md:px-8 py-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
