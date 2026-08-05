import { type ReactNode, useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package, History, User, CalendarClock, Power, Smartphone, Menu, X as CloseIcon } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useEntregadorStatus } from "@/hooks/use-entregador-status";
import { useTurnosDisponiveisCount } from "@/hooks/use-turnos-disponiveis-count";
import { useMobilePortraitOnly } from "@/hooks/use-mobile-check";
import { useChatNaoLidasGlobal } from "@/hooks/use-chat-nao-lidas";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  const [open, setOpen] = useState(false);

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
    <div className="flex flex-col items-center gap-3 w-full">
      <button
        onClick={toggle}
        data-status-toggle
        className="w-full relative inline-flex items-center justify-center h-16 rounded-2xl transition-all duration-300 shadow-lg"
        style={{ 
          background: online ? "#AE0000" : "#0d2c54",
          boxShadow: online ? "0 8px 25px -8px rgba(174,0,0,0.5)" : "0 8px 25px -8px rgba(13,44,84,0.5)"
        }}
        aria-label={online ? "Ficar offline" : "Ficar online"}
      >
        <div className="flex items-center gap-3">
          <Power className="h-6 w-6 text-white" strokeWidth={3} />
          <span className="text-lg font-black tracking-[0.15em] uppercase text-white">
            {online ? "DESCONECTAR" : "CONECTAR"}
          </span>
        </div>
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

        <main className="flex-1 px-4 py-4 pb-24 relative pt-20">
          <div className="fixed top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
            <div className="pointer-events-auto">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <button 
                    className="flex items-center justify-center h-10 w-10 rounded-xl bg-[#0d2c54] text-white shadow-lg active:scale-95 transition-transform"
                  >
                    <Menu className="h-6 w-6" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0 border-none bg-[#0d2c54] text-white">
                  <SheetHeader className="p-6 border-b border-white/10">
                    <SheetTitle className="text-white text-left font-black tracking-tighter text-xl">MENU</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col py-4">
                    {NAV.map((item) => {
                      const active = path.startsWith(item.to);
                      const Icon = item.icon;
                      const badge = "badgeKey" in item ? badges[item.badgeKey] ?? 0 : 0;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-4 px-6 py-4 text-sm font-bold uppercase tracking-[0.2em] transition-all ${
                            active ? "bg-[#AE0000] text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <div className="relative">
                            <Icon className="h-5 w-5" strokeWidth={2} />
                            {badge > 0 && (
                              <span className="absolute -top-2 -right-2 min-w-[16px] h-[16px] px-1 grid place-items-center rounded-full text-[8px] font-black bg-[#AE0000] text-white ring-2 ring-[#0d2c54]">
                                {badge > 9 ? "9+" : badge}
                              </span>
                            )}
                          </div>
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            
            <div className="pointer-events-auto">
              {topFixed}
            </div>
          </div>
          <div className="pp-reveal">

            <div className="h-6" />
            {children}
          </div>
        </main>
      </div>

      {/* Bottom tab bar - mobile only */}
      <RetornoLojaDialog />
      <nav
        data-entregador-nav
        className="fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.08] px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+8px)]"
        style={{ background: "#0d2c54" }}
      >
        <div className="flex flex-col gap-3">
          {path.startsWith("/entregador/disponiveis") && StatusToggleLarge}
        </div>
      </nav>

    </div>
  );
}
