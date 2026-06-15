import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  RealtimePostgresChangesPayload,
  RealtimePostgresChangesFilter,
} from "@supabase/supabase-js";

type Event = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface RealtimeOptions {
  /** Nome único do canal. Use algo estável e específico, ex. `pedidos:loja:${id}`. */
  channel: string;
  table: string;
  event?: Event;
  /** Filtro Postgres no formato "coluna=eq.valor". */
  filter?: string;
  schema?: string;
  enabled?: boolean;
}

/**
 * Inscreve em mudanças realtime de uma tabela e chama `onChange` para cada evento.
 * Cancela inscrição no unmount. Reinscreve quando dependências mudam.
 */
export function useRealtimeChannel<T extends Record<string, unknown>>(
  options: RealtimeOptions,
  onChange: (payload: RealtimePostgresChangesPayload<T>) => void,
): void {
  const {
    channel,
    table,
    event = "*",
    filter,
    schema = "public",
    enabled = true,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const ch = supabase.channel(channel);
    const config = {
      event,
      schema,
      table,
      ...(filter ? { filter } : {}),
    } as unknown as RealtimePostgresChangesFilter<Event>;

    ch.on("postgres_changes", config, (payload) => {
      onChange(payload as RealtimePostgresChangesPayload<T>);
    }).subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, table, event, filter, schema, enabled]);
}
