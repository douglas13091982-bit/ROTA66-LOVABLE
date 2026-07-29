import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type PedidoMin = Record<string, any>;

/**
 * Conjunto de mutações sobre `pedidos` da loja. Todas invalidam
 * `["pedidos", lojaId]` em caso de sucesso.
 */
export function usePedidoActions(lojaId: string | undefined) {
  const qc = useQueryClient();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["pedidos", lojaId] });

  /**
   * Quando o pedido não sai de "em preparo", a causa quase sempre é saldo
   * insuficiente da loja (trigger `validar_saldo_loja_para_pedido`) ou falta de
   * permissão. Aqui traduzimos isso numa mensagem clara em vez de um
   * "sucesso" enganoso.
   */
  const explicarFalhaPronto = async (ids: string[]) => {
    const { data: peds } = await supabase
      .from("pedidos")
      .select("id, loja_id, taxa_entrega, bonus_entregador")
      .in("id", ids);
    const lista = (peds ?? []) as any[];
    const necessario = lista.reduce(
      (acc, p) => acc + Number(p.taxa_entrega ?? 0) + Number(p.bonus_entregador ?? 0),
      0,
    );
    const alvoLoja = lojaId ?? lista[0]?.loja_id;
    if (alvoLoja) {
      const { data: s } = await supabase
        .from("lojas_saldo" as any)
        .select("saldo")
        .eq("loja_id", alvoLoja)
        .maybeSingle();
      const saldo = Number((s as any)?.saldo ?? 0);
      if (saldo < necessario) {
        toast.error(
          `Saldo insuficiente: a loja tem R$ ${saldo.toFixed(2)} e precisa de R$ ${necessario.toFixed(2)} para liberar o pedido. Recarregue o saldo.`,
        );
        return;
      }
    }
    toast.error("Não foi possível liberar o pedido. Atualize a página e tente novamente.");
  };

  const traduzErro = (msg: string) => {
    if (/saldo insuficiente/i.test(msg)) return msg;
    return msg;
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { data, error } = await supabase
      .from("pedidos")
      .update({ status: newStatus as any })
      .eq("id", id)
      .select("id, status");
    if (error) {
      toast.error(traduzErro(error.message));
      return;
    }
    if (newStatus === "pronto" && (!data || data.length === 0)) {
      await explicarFalhaPronto([id]);
      invalidate();
      return;
    }
    invalidate();
    if (newStatus === "pronto") {
      toast.success("Pedido pronto! Os entregadores vinculados já podem aceitar.");
    }
  };


  const marcarLoteComoPronto = async (ids: string[]) => {
    if (ids.length === 0) return;

    // Quando a loja agrupa 2+ pedidos, garantimos que eles compartilhem
    // rota_id (e o mesmo codigo_coleta) — assim o entregador enxerga
    // como UM ÚNICO card de rota agrupada e pode aceitar tudo de uma vez.
    if (ids.length > 1) {
      const { data: existentes } = await supabase
        .from("pedidos")
        .select("id, rota_id, codigo_coleta")
        .in("id", ids);

      const rotaCompartilhada =
        (existentes ?? []).find((p: any) => p.rota_id)?.rota_id ??
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`);
      const codigoCompartilhado =
        (existentes ?? []).find((p: any) => p.codigo_coleta)?.codigo_coleta ??
        String(Math.floor(1000 + Math.random() * 9000));

      for (let i = 0; i < ids.length; i++) {
        const { error } = await supabase
          .from("pedidos")
          .update({
            status: "pronto" as any,
            rota_id: rotaCompartilhada,
            rota_ordem: i + 1,
            codigo_coleta: codigoCompartilhado,
          } as any)
          .eq("id", ids[i])
          .eq("status", "em_preparo");
        if (error) {
          toast.error(error.message);
          return;
        }
      }
    } else {
      const { error } = await supabase
        .from("pedidos")
        .update({ status: "pronto" as any })
        .in("id", ids)
        .eq("status", "em_preparo");
      if (error) {
        toast.error(error.message);
        return;
      }
    }

    invalidate();
    toast.success(`${ids.length} pedidos marcados como prontos!`);
  };

  const toggleArquivado = async (id: string, arquivado: boolean) => {
    const { error } = await supabase
      .from("pedidos")
      .update({ arquivado: !arquivado })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidate();
    toast.success(arquivado ? "Pedido desarquivado." : "Pedido arquivado.");
  };

  const cancelarPedido = async (id: string) => {
    // Ao cancelar, arquivamos automaticamente — o pedido fica disponível
    // na aba "Mostrar arquivados" para consulta ou reenvio.
    const { error } = await supabase
      .from("pedidos")
      .update({ status: "cancelado", arquivado: true })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidate();
    toast.success("Pedido cancelado e movido para arquivados.");
  };

  /**
   * Reenvia um pedido cancelado (ou já entregue) de volta para o pool de
   * entregadores: limpa entregador/rota/aceite e volta o status para "pronto",
   * desarquivando e regenerando o código de coleta.
   */
  const reenviarParaEntregadores = async (id: string) => {
    const novoCodigoColeta = String(Math.floor(1000 + Math.random() * 9000));
    const { error } = await supabase
      .from("pedidos")
      .update({
        status: "pronto" as any,
        entregador_id: null,
        rota_id: null,
        rota_ordem: null,
        
        coleta_confirmada_em: null,
        entrega_confirmada_em: null,
        codigo_coleta: novoCodigoColeta,
        arquivado: false,
      } as any)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidate();
    toast.success("Pedido reenviado aos entregadores.");
  };

  const abrirWhatsAppRastreio = (pedido: PedidoMin) => {
    const telefone = String(pedido.cliente_telefone ?? "").replace(/\D/g, "");
    if (!telefone) {
      toast.error("Cliente não possui telefone cadastrado.");
      return;
    }
    const baseUrl = window.location.origin;
    const linkRastreio = `${baseUrl}/rastreio/${pedido.id}`;
    const mensagem =
      `Olá ${pedido.cliente_nome}! 👋\n\nSeu pedido #${pedido.numero} está a caminho! 🚀\n\n` +
      `🔗 Acompanhe em tempo real:\n${linkRastreio}\n\n` +
      `🔐 Código de confirmação de entrega:\n${pedido.codigo_entrega}\n\n` +
      `Obrigado pela preferência! 😊`;
    const numeroWa = telefone.startsWith("55") ? telefone : `55${telefone}`;
    window.open(`https://wa.me/${numeroWa}?text=${encodeURIComponent(mensagem)}`, "_blank");
  };

  return { updateStatus, marcarLoteComoPronto, toggleArquivado, cancelarPedido, reenviarParaEntregadores, abrirWhatsAppRastreio };
}

export type PedidoActions = ReturnType<typeof usePedidoActions>;
