import { useEffect, useRef } from "react";
import { convocarEntregadoresCidade } from "@/lib/convocacao.functions";
import { lojaAbertaAgora, type HorarioFuncionamento } from "@/lib/horario-funcionamento";

/**
 * Enquanto o painel da loja estiver aberto, verifica periodicamente se a loja
 * entrou no horário de funcionamento. Quando isso acontece, pede ao servidor
 * para convocar os entregadores da cidade.
 *
 * O servidor revalida horário, permissão e faz o "uma vez por dia", então
 * chamar mais de uma vez é inofensivo.
 */
export function useConvocacaoAbertura(loja: any | null | undefined) {
  const enviadoRef = useRef<string | null>(null);

  useEffect(() => {
    const lojaId = loja?.id as string | undefined;
    if (!lojaId || loja?.ativa === false) return;

    const tentar = async () => {
      const agora = new Date(
        new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
      );
      const chaveDia = `${lojaId}-${agora.toDateString()}`;
      if (enviadoRef.current === chaveDia) return;
      if (!lojaAbertaAgora(loja?.horario_funcionamento as HorarioFuncionamento | null, agora)) {
        return;
      }
      enviadoRef.current = chaveDia;
      try {
        await convocarEntregadoresCidade({
          data: { loja_id: lojaId, motivo: "abertura" },
        });
      } catch (e) {
        console.error("[convocacao-abertura] falhou", e);
      }
    };

    tentar();
    const id = setInterval(tentar, 60_000);
    return () => clearInterval(id);
  }, [loja?.id, loja?.ativa, loja?.horario_funcionamento]);
}
