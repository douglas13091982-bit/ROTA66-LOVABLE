import { type ReactNode, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package, History, User, CalendarClock, Power, Smartphone } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useEntregadorStatus } from "@/hooks/use-entregador-status";
import { useTurnosDisponiveisCount } from "@/hooks/use-turnos-disponiveis-count";
import { useMobilePortraitOnly } from "@/hooks/use-mobile-check";
import { useChatNaoLidasGlobal } from "@/hooks/use-chat-nao-lidas";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useSomPush } from "@/hooks/use-som-push";
import { RetornoLojaDialog } from "@/features/entregador-ativos/components/RetornoLojaDialog";


import { supabase } from "@/integrations/supabase/client";
import { subscribeLazy } from "@/lib/realtime-lazy";
import { instalarLimpezaBadge } from "@/lib/app-badge";
import { useWakeLock } from "@/hooks/use-wake-lock";



const NAV = [
  { to: "/entregador/disponiveis", label: "Pedidos", icon: Package },
  { to: "/entregador/turnos", label: "Turnos", icon: CalendarClock, badgeKey: "turnos" as const },
  { to: "/entregador/historico", label: "Histórico", icon: History },
  { to: "/entregador/perfil", label: "Perfil", icon: User },
] as const;


export function EntregadorShell({ children, title, topFixed }: { children: ReactNode; title: string; topFixed?: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const { online, toggle } = useEntregadorStatus();
  const qc = useQueryClient();
  const turnosCount = useTurnosDisponiveisCount();
  useChatNaoLidasGlobal();
  const push = usePushNotifications();
  useSomPush();
  const badges: Record<string, number> = { turnos: turnosCount };
  const { isMobile } = useMobilePortraitOnly();

  // Zera o contador do ícone do app (badge) ao abrir e ao voltar ao primeiro plano
  useEffect(() => instalarLimpezaBadge(), []);

  // Mantém a tela do celular acesa enquanto o app do entregador estiver aberto
  useWakeLock(true);



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
    const stopCh = subscribeLazy(() =>
      supabase
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
        .subscribe()
    );
    return () => { stopCh(); };
  }, [user?.id, qc]);

  const StatusToggleLarge = (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={toggle}
        data-status-toggle
        className="relative inline-flex items-center h-12 rounded-full p-1.5 transition-all duration-300 border border-[#d3d9e4]"
        style={{ background: "#eef1f6", boxShadow: "inset 0 1px 2px rgba(15,27,45,0.10)" }}
        aria-label={online ? "Ficar offline" : "Ficar online"}
      >
        <span
          className="grid place-items-center h-9 w-14 rounded-full transition-all duration-300"
          style={!online ? { background: "#eef1f6" } : undefined}
        >
          <Power className="h-4 w-4 text-[#0f1b2d]" strokeWidth={2.5} />
        </span>
        <span
          data-surface={online ? "navy" : undefined}
          className={`px-6 h-9 grid place-items-center rounded-full text-xs font-extrabold tracking-[0.28em] transition-all duration-300 ${
            online ? "!text-white" : "text-[#0f1b2d]/60"
          }`}

          style={online ? { background: "#0d2c54", boxShadow: "0 6px 18px -6px rgba(13,44,84,0.55)" } : undefined}

        >
          ON
        </span>
      </button>
    </div>
  );


  if (!isMobile) {
    return (
      <div className="entregador-theme panel-premium panel-light min-h-screen flex items-center justify-center p-6">
        <div className="flex flex-col items-center text-center max-w-sm">
          <div className="h-20 w-20 rounded-3xl grid place-items-center mb-6"
            style={{ background: "linear-gradient(135deg, #AE0000, #6D0000)" }}
          >
            <Smartphone className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#0f1b2d] tracking-tight mb-3">Acesse pelo celular</h1>
          <p className="text-[#6b7688] text-sm leading-relaxed">
            O app do entregador foi projetado exclusivamente para dispositivos móveis.
            Abra esta página no seu smartphone para continuar.
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="entregador-theme panel-premium panel-light flex flex-col min-h-screen">

      {/* Main - mobile only, no sidebar */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="pointer-events-none absolute inset-0 pp-grid-overlay opacity-60" />

        <main className="flex-1 px-4 py-4 pb-24 relative">
          <div className="pp-reveal">

            {path.startsWith("/entregador/disponiveis") ? (
              <div className="entregador-sticky-top sticky top-0 z-30 -mx-4 px-4 pt-6 pb-3">
                <div className="flex flex-col items-center justify-center gap-2 mb-4">
                  {StatusToggleLarge}
                </div>
                {topFixed}
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
        data-entregador-nav
        className="fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.08] pb-[env(safe-area-inset-bottom)]"
        style={{ background: "#0d2c54" }}
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
                data-nav-link
                data-active={active ? "true" : "false"}
                className={`group relative flex flex-col items-center justify-center gap-2 py-3.5 text-[10px] font-semibold uppercase tracking-[0.22em] transition-all duration-300 ${
                  active ? "text-white" : "text-white/70 hover:text-white"
                }`}
              >
                {active && (
                  <span className="absolute inset-x-1 inset-y-1" style={{ background: "#AE0000" }} />
                )}

                <div className="relative z-10">
                  <Icon
                    className={`h-6 w-6 transition-all duration-300 ${
                      active ? "text-white" : "text-white/70 group-hover:text-white"
                    }`}
                    strokeWidth={1.75}
                  />
                  {badge > 0 && (
                    <span
                      data-nav-badge
                      className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[9px] font-bold text-white animate-pulse ring-2 ring-[#0d2c54]"
                      style={{
                        background: "#AE0000",
                        boxShadow: "0 0 10px -1px rgba(174,0,0,0.9)",
                      }}

                      aria-label={`${badge} oportunidades`}
                    >
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}
