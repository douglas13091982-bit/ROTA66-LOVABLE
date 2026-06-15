/**
 * Hook de autocomplete de clientes recorrentes da loja.
 * Encapsula debounce, fetch e estado das sugestões.
 */

import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ClienteSugestao = {
  id: string;
  nome: string;
  telefone: string;
  endereco: string | null;
  complemento: string | null;
};

const DEBOUNCE_MS = 200;
const TERMO_MIN_LEN = 2;
const LIMITE_SUGESTOES = 6;

export function useClientesAutocomplete(lojaId: string, enabled: boolean) {
  const [sugestoes, setSugestoes] = useState<ClienteSugestao[]>([]);
  const [campoAtivo, setCampoAtivo] = useState<"nome" | "telefone" | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buscar(campo: "nome" | "telefone", valor: string) {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const termo = valor.trim();
    if (termo.length < TERMO_MIN_LEN) {
      setSugestoes([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("clientes_loja")
        .select("id, nome, telefone, endereco, complemento")
        .eq("loja_id", lojaId)
        .ilike(campo, `%${termo}%`)
        .limit(LIMITE_SUGESTOES);
      setSugestoes(data ?? []);
    }, DEBOUNCE_MS);
  }

  function limpar() {
    setSugestoes([]);
    setCampoAtivo(null);
  }

  return { sugestoes, campoAtivo, setCampoAtivo, buscar, limpar };
}
