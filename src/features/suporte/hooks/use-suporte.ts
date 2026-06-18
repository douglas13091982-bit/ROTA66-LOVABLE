import { useEffect, useId } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Mensagem, Modo, Ticket } from "../types";

const TICKETS_KEY = (modo: Modo, lojaId?: string) =>
  modo === "loja" ? ["suporte-tickets", "loja", lojaId] : ["suporte-tickets", "admin"];

export function useTickets(modo: Modo, lojaId?: string) {
  return useQuery({
    queryKey: TICKETS_KEY(modo, lojaId),
    enabled: modo === "admin" ? true : !!lojaId,
    queryFn: async (): Promise<Ticket[]> => {
      if (modo === "admin") {
        const { data, error } = await (supabase as any).rpc("admin_listar_tickets_suporte");
        if (error) throw error;
        return (data ?? []) as Ticket[];
      }
      const { data, error } = await (supabase as any)
        .from("suporte_tickets")
        .select("*")
        .eq("loja_id", lojaId!)
        .order("ultima_mensagem_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Ticket[];
    },
  });
}

export function useTicketsRealtime(modo: Modo, lojaId?: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (modo === "loja" && !lojaId) return;
    const channel = supabase
      .channel(`suporte-tickets-${modo}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suporte_tickets" },
        () => {
          qc.invalidateQueries({ queryKey: TICKETS_KEY(modo, lojaId) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [modo, lojaId, qc]);
}

export function useMensagens(ticketId: string | null) {
  return useQuery({
    queryKey: ["suporte-mensagens", ticketId],
    enabled: !!ticketId,
    queryFn: async (): Promise<Mensagem[]> => {
      const { data, error } = await (supabase as any)
        .from("suporte_mensagens")
        .select("*")
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Mensagem[];
    },
  });
}

export function useMensagensRealtime(ticketId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`suporte-mensagens-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "suporte_mensagens", filter: `ticket_id=eq.${ticketId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["suporte-mensagens", ticketId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, qc]);
}

export function useEnviarMensagem(modo: Modo) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ticketId: string; mensagem: string; autorId: string }) => {
      const { error } = await (supabase as any).from("suporte_mensagens").insert({
        ticket_id: input.ticketId,
        autor_id: input.autorId,
        autor_tipo: modo,
        mensagem: input.mensagem.trim(),
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["suporte-mensagens", vars.ticketId] });
    },
  });
}

export function useCriarTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      lojaId: string;
      assunto: string;
      mensagemInicial: string;
      prioridade: "normal" | "alta";
      autorId: string;
    }) => {
      const { data: ticket, error } = await (supabase as any)
        .from("suporte_tickets")
        .insert({
          loja_id: input.lojaId,
          assunto: input.assunto.trim(),
          prioridade: input.prioridade,
          criado_por: input.autorId,
        })
        .select()
        .single();
      if (error) throw error;
      const { error: msgErr } = await (supabase as any).from("suporte_mensagens").insert({
        ticket_id: ticket.id,
        autor_id: input.autorId,
        autor_tipo: "loja",
        mensagem: input.mensagemInicial.trim(),
      });
      if (msgErr) throw msgErr;
      return ticket as Ticket;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suporte-tickets"] });
    },
  });
}

export function useMarcarLido() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await (supabase as any).rpc("marcar_ticket_lido", { _ticket_id: ticketId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suporte-tickets"] });
    },
  });
}

export function useFecharTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await (supabase as any).rpc("fechar_ticket_suporte", { _ticket_id: ticketId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suporte-tickets"] });
    },
  });
}

/** Badge contador para o menu — total de não-lidas do lado do usuário. */
export function useSuporteBadge(modo: Modo, lojaId?: string) {
  const { data } = useTickets(modo, lojaId);
  useTicketsRealtime(modo, lojaId);
  if (!data) return 0;
  const campo = modo === "loja" ? "nao_lidas_loja" : "nao_lidas_admin";
  return data.reduce((acc, t) => acc + ((t as any)[campo] ?? 0), 0);
}
