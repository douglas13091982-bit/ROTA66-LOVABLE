import { type ReactNode, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package, History, User, CalendarClock, Power, Smartphone, Menu, Store, ChevronDown } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useEntregadorStatus } from "@/hooks/use-entregador-status";
import { useTurnosDisponiveisCount } from "@/hooks/use-turnos-disponiveis-count";
import { usePedidosDisponiveis } from "@/hooks/use-pedidos-disponiveis";
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
  const { ganhoHoje } = usePedidosDisponiveis([]);
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
    <div className="entregador-theme flex flex-col min-h-screen bg-[#0d2c54]">
      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Floating Bar (Overlay) */}
        {path.startsWith("/entregador/disponiveis") && (
          <div className="absolute top-0 inset-x-0 z-50 p-4 flex items-center justify-between">
            <button className="w-12 h-12 rounded-full bg-[#1a2b4b]/80 backdrop-blur-md flex items-center justify-center text-white shadow-lg border border-white/10">
              <Menu className="w-6 h-6" />
              {/* Notificação vermelha no ícone do menu se houver docs ou algo pendente */}
              <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-[#AE0000] rounded-full border-2 border-[#0d2c54]" />
            </button>

            <div className="flex flex-col items-center">
              <button className="flex items-center gap-2 bg-[#1a2b4b]/80 backdrop-blur-md px-5 py-2.5 rounded-full text-white shadow-lg border border-white/10">
                <span className="text-lg font-black tracking-tight">R$ {ganhoHoje.toFixed(2).replace(".", ",")}</span>
                <ChevronDown className="w-4 h-4 opacity-60" />
              </button>
              
              <button className="mt-2 flex items-center gap-1.5 bg-[#AE0000] px-3 py-1 rounded-full text-white shadow-md border border-white/10 animate-pulse">
                <span className="text-[10px] font-black uppercase tracking-wider">% 0% de Taxa</span>
                <span className="text-[10px] font-bold opacity-80">| Ativar</span>
                <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
              </button>
            </div>

            <button className="w-12 h-12 rounded-full bg-[#1a2b4b]/80 backdrop-blur-md flex items-center justify-center text-white shadow-lg border border-white/10">
              <Store className="w-6 h-6" />
            </button>
          </div>
        )}

        <main className="flex-1 relative overflow-hidden">
          {children}
        </main>
      </div>

      {/* Bottom Floating Control (Only on Disponiveis) */}
      {path.startsWith("/entregador/disponiveis") && (
        <div className="fixed bottom-[90px] inset-x-0 z-40 px-6 pointer-events-none">
          <div className="max-w-md mx-auto flex items-center gap-4 pointer-events-auto">
            <button className="w-14 h-14 rounded-2xl bg-[#1a2b4b]/95 backdrop-blur-md flex items-center justify-center text-white shadow-2xl border border-white/10">
              <div className="relative">
                <div className="w-5 h-[2px] bg-white rounded-full mb-1" />
                <div className="w-5 h-[2px] bg-white rounded-full mb-1" />
                <div className="w-2.5 h-[2.5px] bg-[#AE0000] rounded-full absolute -top-1 -right-1" />
              </div>
            </button>

            <button
              onClick={toggle}
              className={`flex-1 h-16 rounded-3xl flex items-center justify-center text-2xl font-black uppercase tracking-widest text-white shadow-2xl border-b-4 transition-all active:scale-95 ${
                online 
                  ? "bg-[#22c55e] border-[#16a34a] shadow-[0_0_30px_rgba(34,197,94,0.4)]" 
                  : "bg-[#AE0000] border-[#8F0000] shadow-[0_0_30px_rgba(174,0,0,0.4)]"
              }`}
            >
              {online ? "Online" : "Conectar"}
            </button>

            <button className="w-14 h-14 rounded-2xl bg-[#1a2b4b]/95 backdrop-blur-md flex items-center justify-center text-white shadow-2xl border border-white/10">
              <Package className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <RetornoLojaDialog />
      <nav
        data-entregador-nav
        className="fixed bottom-0 inset-x-0 z-50 border-t border-white/5 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.5)]"
        style={{ background: "#0d2c54" }}
      >
        <div className="grid grid-cols-4 h-[75px]">
          {NAV.map((item) => {
            const active = path.startsWith(item.to);
            const Icon = item.icon;
            const badge = "badgeKey" in item ? badges[item.badgeKey] ?? 0 : 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group relative flex flex-col items-center justify-center gap-1.5 transition-all duration-300 ${
                  active ? "bg-[#AE0000] text-white" : "text-white/60 hover:text-white"
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`h-6 w-6 transition-all duration-300 ${
                      active ? "text-white scale-110" : "text-white/60"
                    }`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {badge > 0 && (
                    <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[9px] font-bold text-white bg-[#AE0000] ring-2 ring-[#0d2c54]">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${active ? "text-white" : "text-white/40"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
