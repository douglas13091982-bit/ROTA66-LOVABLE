import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogOverlay, DialogPortal, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Send, MessageCircle, Store, Bike, X } from "lucide-react";
import { toast } from "sonner";

export type ChatSenderRole = "entregador" | "loja";

type Mensagem = {
  id: string;
  pedido_id: string;
  sender_id: string;
  sender_role: ChatSenderRole;
  mensagem: string;
  lida_em: string | null;
  created_at: string;
};

interface ChatPedidoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
  pedidoNumero?: number;
  senderRole: ChatSenderRole;
  /** Nome do interlocutor (para exibir no cabeçalho) */
  contraparteNome?: string;
}

/**
 * Badge de mensagens não lidas para exibir no cartão do pedido.
 */
export function PedidoChatBadge({
  pedidoId,
  senderRole,
  onClick,
}: {
  pedidoId: string;
  senderRole: ChatSenderRole;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: naoLidas = 0 } = useQuery({
    queryKey: ["chat-nao-lidas", pedidoId, user?.id],
    enabled: !!user?.id,
    refetchInterval: 15000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("pedido_mensagens" as any)
        .select("id", { count: "exact", head: true })
        .eq("pedido_id", pedidoId)
        .is("lida_em", null)
        .neq("sender_id", user!.id);
      if (error) return 0;
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (!user?.id) return;
    const channelKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(`chat-badge-${pedidoId}-${user.id}-${channelKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedido_mensagens", filter: `pedido_id=eq.${pedidoId}` },
        () => qc.invalidateQueries({ queryKey: ["chat-nao-lidas", pedidoId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [pedidoId, user?.id, qc]);

  if (naoLidas === 0) return null;

  return (
    <span
      onClick={onClick}
      className="relative inline-flex items-center justify-center"
      title={`${naoLidas} mensagem(ns) nova(s)`}
    >
      <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
      <span className="relative inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold shadow-red">
        {naoLidas > 9 ? "9+" : naoLidas}
      </span>
    </span>
  );
}

export function ChatPedido({ open, onOpenChange, pedidoId, pedidoNumero, senderRole, contraparteNome }: ChatPedidoProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Acompanha o tamanho da viewport visível APENAS no mobile, para que o
  // teclado virtual não cubra o campo de digitação. No desktop deixamos o
  // Dialog usar o posicionamento padrão (centralizado).
  const [viewportH, setViewportH] = useState<number | null>(null);
  const [viewportOffset, setViewportOffset] = useState(0);
  useEffect(() => {
    if (!open || typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const isMobile = () => window.matchMedia("(max-width: 639px)").matches;
    const update = () => {
      if (isMobile()) {
        setViewportH(vv.height);
        setViewportOffset(vv.offsetTop);
      } else {
        setViewportH(null);
        setViewportOffset(0);
      }
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [open]);


  const { data: mensagens, isLoading } = useQuery({
    queryKey: ["chat-pedido", pedidoId],
    enabled: open && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedido_mensagens" as any)
        .select("*")
        .eq("pedido_id", pedidoId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Mensagem[];
    },
  });

  // Realtime
  useEffect(() => {
    if (!open) return;
    const channelKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(`chat-pedido-${pedidoId}-${channelKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedido_mensagens", filter: `pedido_id=eq.${pedidoId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["chat-pedido", pedidoId] });
          qc.invalidateQueries({ queryKey: ["chat-nao-lidas"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, pedidoId, qc]);

  // Scroll bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens, open]);

  // Marcar como lidas as mensagens recebidas
  useEffect(() => {
    if (!open || !mensagens || !user?.id) return;
    const naoLidasDosOutros = mensagens.filter((m) => !m.lida_em && m.sender_id !== user.id).map((m) => m.id);
    if (naoLidasDosOutros.length === 0) return;
    (async () => {
      await supabase
        .from("pedido_mensagens" as any)
        .update({ lida_em: new Date().toISOString() })
        .in("id", naoLidasDosOutros);
      qc.invalidateQueries({ queryKey: ["chat-nao-lidas"] });
    })();
  }, [open, mensagens, user?.id, qc]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = texto.trim();
    if (!t || !user?.id || enviando) return;
    setEnviando(true);
    const { error } = await supabase.from("pedido_mensagens" as any).insert({
      pedido_id: pedidoId,
      sender_id: user.id,
      sender_role: senderRole,
      mensagem: t,
    });
    setEnviando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTexto("");
    qc.invalidateQueries({ queryKey: ["chat-pedido", pedidoId] });
  };

  const outroLabel = senderRole === "entregador" ? "Loja" : "Entregador";
  const OutroIcon = senderRole === "entregador" ? Store : Bike;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className="fixed z-50 flex flex-col gap-0 overflow-hidden rounded-xl border border-[oklch(0.78_0.16_75_/_0.40)] bg-[oklch(0.12_0.015_260)] p-0 shadow-xl outline-none w-[calc(100svw-1rem)] max-w-2xl sm:h-[70vh] sm:max-h-[560px]"
          style={
            viewportH
              ? {
                  top: `${viewportOffset}px`,
                  left: 0,
                  right: 0,
                  bottom: "auto",
                  margin: "0 auto",
                  height: `${viewportH}px`,
                  maxHeight: `${viewportH}px`,
                  translate: "none",
                  transform: "none",
                }
              : {
                  inset: 0,
                  margin: "auto",
                  height: "fit-content",
                  maxHeight: "calc(100svh - 1rem)",
                  translate: "none",
                  transform: "none",
                }
          }
        >


        <DialogHeader className="px-5 py-3 border-b border-[oklch(0.78_0.16_75_/_0.25)] bg-[oklch(0.14_0.012_260)] shrink-0 relative">
          <DialogTitle className="font-['Sora'] text-base tracking-wide flex items-center gap-2 pr-8 text-white">
            <MessageCircle className="h-5 w-5 text-[var(--rota-gold)]" />
            Chat {pedidoNumero ? <span className="text-[var(--rota-gold)]">· Pedido #{pedidoNumero}</span> : ""}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 text-[0.65rem] pr-8 uppercase tracking-[0.22em] font-bold text-[oklch(0.52_0.02_260)]">
            <OutroIcon className="h-3.5 w-3.5 text-[var(--rota-gold)]" />
            Falando com {contraparteNome ?? outroLabel}
          </DialogDescription>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-2.5 right-3 h-8 w-8 flex items-center justify-center rounded-full hover:bg-[oklch(1_0_0_/_0.035)] transition-colors"
            aria-label="Fechar chat"
          >
            <X className="h-4 w-4 text-[oklch(0.68_0.02_260)]" />
          </button>
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[oklch(0.12_0.015_260)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-[oklch(0.68_0.02_260)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !mensagens || mensagens.length === 0 ? (
            <div className="text-center py-10 text-sm text-[oklch(0.52_0.02_260)]">
              Nenhuma mensagem ainda. <br />
              Envie a primeira mensagem se precisar comunicar algo sobre este pedido.
            </div>
          ) : (
            mensagens.map((m) => {
              const meu = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${meu ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm leading-snug shadow-soft ${
                      meu
                        ? "bg-gradient-red text-white rounded-br-sm"
                        : "bg-[oklch(0.18_0.02_260)] border border-[oklch(0.28_0.035_260_/_0.55)] text-[oklch(0.97_0_0)] rounded-bl-sm"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{m.mensagem}</div>
                    <div className={`text-[10px] mt-1 ${meu ? "text-white/70" : "text-[oklch(0.52_0.02_260)]"}`}>
                      {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={enviar} className="shrink-0 flex items-end gap-2 p-3 border-t border-[oklch(0.78_0.16_75_/_0.25)] bg-[oklch(0.14_0.012_260)] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar(e as any);
              }
            }}
            placeholder="Escreva uma mensagem..."
            rows={1}
            maxLength={2000}
            disabled={enviando}
            className="flex-1 resize-none rounded-xl border border-[oklch(0.28_0.035_260_/_0.55)] bg-[oklch(0.12_0.015_260)] px-3 py-2 text-sm text-white placeholder:text-[oklch(0.52_0.02_260)] focus:outline-none focus:ring-2 focus:ring-[oklch(0.55_0.21_27_/_0.40)] max-h-32"
          />
          <button
            type="submit"
            disabled={enviando || !texto.trim()}
            className="shrink-0 h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-red text-white disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all duration-200"
            aria-label="Enviar"
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>

  );
}

/**
 * Botão de abrir chat com badge de mensagens não lidas para o usuário atual.
 */
export function ChatPedidoButton({
  pedidoId,
  pedidoNumero,
  senderRole,
  contraparteNome,
  variant = "ghost",
}: {
  pedidoId: string;
  pedidoNumero?: number;
  senderRole: ChatSenderRole;
  contraparteNome?: string;
  variant?: "ghost" | "solid";
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: naoLidas = 0 } = useQuery({
    queryKey: ["chat-nao-lidas", pedidoId, user?.id],
    enabled: !!user?.id,
    refetchInterval: 15000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("pedido_mensagens" as any)
        .select("id", { count: "exact", head: true })
        .eq("pedido_id", pedidoId)
        .is("lida_em", null)
        .neq("sender_id", user!.id);
      if (error) return 0;
      return count ?? 0;
    },
  });

  // Realtime para atualizar badge mesmo com o chat fechado
  useEffect(() => {
    if (!user?.id) return;
    const channelKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(`chat-badge-${pedidoId}-${user.id}-${channelKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedido_mensagens", filter: `pedido_id=eq.${pedidoId}` },
        () => qc.invalidateQueries({ queryKey: ["chat-nao-lidas", pedidoId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [pedidoId, user?.id, qc]);

  const base =
    variant === "solid"
      ? "inline-flex items-center gap-2 px-3 py-2 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-xs tracking-wider rounded-md hover:opacity-90"
      : "relative inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-background/60 hover:bg-muted/60 text-sm font-semibold transition-colors";

  return (
    <span
      className="inline-flex"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button type="button" onClick={() => setOpen(true)} className={base}>
        <MessageCircle className="h-4 w-4" />
        Chat
        {naoLidas > 0 && (
          <span className="ml-1 min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center text-[10px] font-bold rounded-full bg-primary text-primary-foreground shadow-red">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>
      <ChatPedido
        open={open}
        onOpenChange={setOpen}
        pedidoId={pedidoId}
        pedidoNumero={pedidoNumero}
        senderRole={senderRole}
        contraparteNome={contraparteNome}
      />
    </span>
  );
}
