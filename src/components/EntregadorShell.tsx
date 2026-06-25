import { type ReactNode, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package, History, User, CalendarClock, Power, Smartphone } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/use-auth";
import { useEntregadorStatus } from "@/hooks/use-entregador-status";
import { useTurnosDisponiveisCount } from "@/hooks/use-turnos-disponiveis-count";
import { useMobilePortraitOnly } from "@/hooks/use-mobile-check";
import { useChatNaoLidasGlobal } from "@/hooks/use-chat-nao-lidas";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { RetornoLojaDialog } from "@/features/entregador-ativos/components/RetornoLojaDialog";


import { supabase } from "@/integrations/supabase/client";


const NAV = [
  { to: "/entregador/disponiveis", label: "Pedidos", icon: Package },
  { to: "/entregador/turnos", label: "Turnos", icon: CalendarClock, badgeKey: "turnos" as const },
  { to: "/entregador/historico", label: "Histórico", icon: History },
  { to: "/entregador/perfil", label: "Perfil", icon: User },
] as const;


export function EntregadorShell({ children, title }: { children: ReactNode; title: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const { online, toggle } = useEntregadorStatus();
  const qc = useQueryClient();
  const turnosCount = useTurnosDisponiveisCount();
  useChatNaoLidasGlobal();
  const push = usePushNotifications();
  const badges: Record<string, number> = { turnos: turnosCount };
  const { isMobile } = useMobilePortraitOnly();

  // Pede permissão de push automaticamente na 1ª vez (somente quando há usuário e estado === "default")
  useEffect(() => {
    if (!user?.id) return;
    if (push.state !== "default") return;
    const key = `push-prompted-${user.id}`;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    // pequeno delay para não atropelar o load
    const t = setTimeout(() => {
      push.enable().catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [user?.id, push.state, push.enable]);
  

  useEffect(() => {
    // Tenta travar a orientação em retrato para que o app nunca gire
    const lockPortrait = async () => {
      try {
        await (screen as any).orientation?.lock?.("portrait");
      } catch {
        // Se o navegador não permitir, continuamos sem mostrar tela de giro
      }
    };
    lockPortrait();

    if (!user?.id) return;
    const ch = supabase
      .channel(`entregador-pagamentos-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pedidos", filter: `entregador_id=eq.${user.id}` },
        (payload) => {
          const oldPaga = (payload.old as any)?.entrega_paga;
          const newRow = payload.new as any;
          if (!oldPaga && newRow?.entrega_paga) {
            toast.success(`💸 Pedido #${newRow.numero}: a loja marcou sua entrega como paga!`, {
              duration: 8000,
            });
            qc.invalidateQueries({ queryKey: ["pedidos-ativos"] });
            qc.invalidateQueries({ queryKey: ["pedidos-historico"] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  const StatusToggleLarge = (
    <div className="flex flex-col items-center gap-2">
      <div className="pp-eyebrow text-[10px]">Estado atual</div>
      <button
        onClick={toggle}
        className="relative inline-flex items-center h-12 rounded-full border border-white/10 bg-black/60 p-1.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.7)] transition-all duration-300"
        aria-label={online ? "Ficar offline" : "Ficar online"}
      >
        <span
          className={`grid place-items-center h-9 w-14 rounded-full transition-all duration-300 ${
            !online
              ? "bg-white/[0.06] border border-white/10 text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.08)]"
              : "text-white/40"
          }`}
        >
          <Power className="h-4 w-4" />
        </span>
        <span
          className={`px-6 h-9 grid place-items-center rounded-full text-xs font-bold tracking-[0.28em] transition-all duration-300 ${
            online
              ? "text-white border border-[oklch(0.6_0.18_155_/_0.55)] shadow-[0_8px_24px_-6px_oklch(0.6_0.18_155_/_0.6)]"
              : "text-white/45"
          }`}
          style={online ? { background: "linear-gradient(135deg, oklch(0.55 0.16 155), oklch(0.42 0.14 155))" } : undefined}
        >
          ON
        </span>
      </button>
    </div>
  );


  if (!isMobile) {
    return (
      <div className="panel-premium min-h-screen flex items-center justify-center p-6">
        <div className="flex flex-col items-center text-center max-w-sm">
          <div className="h-20 w-20 rounded-3xl grid place-items-center mb-6"
            style={{ background: "linear-gradient(135deg, oklch(0.62 0.22 27), oklch(0.42 0.20 27))" }}
          >
            <Smartphone className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-3">Acesse pelo celular</h1>
          <p className="text-white/55 text-sm leading-relaxed">
            O app do entregador foi projetado exclusivamente para dispositivos móveis.
            Abra esta página no seu smartphone para continuar.
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="panel-premium flex flex-col min-h-screen">
      {/* Main - mobile only, no sidebar */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="pointer-events-none absolute inset-0 pp-grid-overlay opacity-60" />

        <main className="flex-1 px-4 py-4 pb-24 relative">
          <div className="pp-reveal">
            {path.startsWith("/entregador/disponiveis") ? (
              <div className="flex flex-col items-center justify-center gap-2 mb-4 pt-6">
                {StatusToggleLarge}
              </div>
            ) : (
              <div className="h-6" />
            )}
            {children}
          </div>
        </main>
      </div>

      {/* Bottom tab bar - mobile only */}
      <RetornoLojaDialog />
      <nav
        className="fixed bottom-0 inset-x-0 z-40 border-t border-white/8 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_40px_-12px_oklch(0_0_0_/_0.6)]"
        style={{ background: "#0f304d" }}
      >
        <div className="grid grid-cols-4">
          {NAV.map((item) => {
            const active = path.startsWith(item.to);
            const Icon = item.icon;
            const badge = "badgeKey" in item ? badges[item.badgeKey] ?? 0 : 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group relative flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-bold uppercase tracking-[0.22em] transition-all duration-300 ${
                  active ? "text-[#da161a]" : "text-white hover:text-[#da161a]"
                }`}
              >
                {active && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-[3px] rounded-b-full bg-[#da161a]"
                    style={{
                      boxShadow: "0 4px 22px -2px oklch(0.55 0.26 25 / 0.55)",
                    }}
                  />
                )}
                <div className="relative">
                  <Icon
                    className={`h-5 w-5 transition-all duration-300 ${
                      active ? "scale-110 text-[#da161a]" : "text-white group-hover:text-[#da161a]"
                    }`}
                  />
                  {badge > 0 && (
                    <span
                      className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[9px] font-bold text-white animate-pulse ring-2 ring-[#0f304d]"
                      style={{
                        background: "linear-gradient(135deg, #da161a, #8a0d10)",
                        boxShadow: "0 0 10px -1px oklch(0.55 0.26 25 / 0.9)",
                      }}
                      aria-label={`${badge} oportunidades`}
                    >
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
