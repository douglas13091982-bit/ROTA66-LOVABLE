import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type LojaProblema = {
  id: string;
  nome: string;
  problemas: string[];
  saldo: number;
  mensalidadeAtrasadaValor: number;
  inativa: boolean;
};

export function useLojasProblema() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lojas-problema", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<LojaProblema[]> => {
      const hoje = new Date().toISOString().slice(0, 10);

      const [lojasRes, saldosRes, mensRes] = await Promise.all([
        supabase
          .from("lojas")
          .select("id, nome, ativa, status, plano_mensal_ativo"),
        supabase.from("lojas_saldo").select("loja_id, saldo"),
        supabase
          .from("mensalidades_loja")
          .select("loja_id, valor, vencimento, pago")
          .eq("pago", false)
          .lt("vencimento", hoje),
      ]);

      const saldos = new Map<string, number>();
      for (const s of saldosRes.data ?? []) {
        saldos.set(s.loja_id as string, Number(s.saldo ?? 0));
      }

      const atrasadas = new Map<string, number>();
      for (const m of mensRes.data ?? []) {
        const prev = atrasadas.get(m.loja_id as string) ?? 0;
        atrasadas.set(m.loja_id as string, prev + Number(m.valor ?? 0));
      }

      const lojas = lojasRes.data ?? [];
      const result: LojaProblema[] = [];

      for (const loja of lojas) {
        const saldo = saldos.get(loja.id) ?? 0;
        const mensAtrasada = atrasadas.get(loja.id) ?? 0;
        const inativa =
          loja.ativa === false || loja.status === "bloqueado";


        const problemas: string[] = [];
        if (saldo < 0) problemas.push(`Saldo negativo (R$ ${saldo.toFixed(2)})`);
        if (mensAtrasada > 0)
          problemas.push(`Mensalidade atrasada (R$ ${mensAtrasada.toFixed(2)})`);
        if (inativa) problemas.push("Loja inativa");

        if (problemas.length > 0) {
          result.push({
            id: loja.id,
            nome: loja.nome,
            problemas,
            saldo,
            mensalidadeAtrasadaValor: mensAtrasada,
            inativa: !!inativa,
          });
        }
      }

      // Ordenar por criticidade: mais problemas primeiro, depois maior atraso
      result.sort((a, b) => {
        if (b.problemas.length !== a.problemas.length)
          return b.problemas.length - a.problemas.length;
        return b.mensalidadeAtrasadaValor - a.mensalidadeAtrasadaValor;
      });

      return result;
    },
  });
}
