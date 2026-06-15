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

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("pedidos")
      .update({ status: newStatus as any })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidate();
    if (newStatus === "pronto") {
      toast.success("Pedido pronto! Os entregadores vinculados já podem aceitar.");
    }
  };

  const marcarLoteComoPronto = async (ids: string[]) => {
    if (ids.length === 0) return;
    const { error } = await supabase
      .from("pedidos")
      .update({ status: "pronto" as any })
      .in("id", ids)
      .eq("status", "em_preparo");
    if (error) {
      toast.error(error.message);
      return;
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
    const { error } = await supabase
      .from("pedidos")
      .update({ status: "cancelado" })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidate();
    toast.success("Pedido cancelado.");
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

  return { updateStatus, marcarLoteComoPronto, toggleArquivado, cancelarPedido, abrirWhatsAppRastreio };
}

export type PedidoActions = ReturnType<typeof usePedidoActions>;
