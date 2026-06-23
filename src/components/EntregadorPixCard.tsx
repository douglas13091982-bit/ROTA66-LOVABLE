import { useQuery } from "@tanstack/react-query";
import { Bike, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AvatarImg } from "@/components/AvatarImg";
import { ChatPedidoButton } from "@/components/ChatPedido";

interface Props {
  pedidoId: string;
  pedidoNumero: number;
}

/**
 * Card de informações do entregador no detalhe do pedido (lado loja).
 * Antes mostrava PIX/QR para a loja pagar — agora a remuneração é via
 * saldo pré-pago, então o card foca em foto grande, contato e chat.
 */
export function EntregadorPixCard({ pedidoId, pedidoNumero }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["entregador-pedido", pedidoId],
    enabled: !!pedidoId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_entregador_pedido", { _pedido_id: pedidoId });
      if (error) throw error;
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    },
  });

  if (isLoading || !data) return null;

  const nome = data.full_name ?? "Entregador";
  const telefone = (data as { phone?: string | null }).phone ?? null;
  const avatar = (data as { avatar_url?: string | null }).avatar_url ?? null;

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Entregador</div>
      <div className="border border-border rounded-md p-4 bg-background space-y-4">
        <div className="flex flex-col items-center text-center gap-3">
          {avatar ? (
            <AvatarImg
              src={avatar}
              alt={nome}
              className="h-28 w-28 rounded-full object-cover border-4 border-indigo-500/40 shrink-0"
              fallback={
                <div className="h-28 w-28 rounded-full bg-indigo-500/15 border-4 border-indigo-500/40 flex items-center justify-center shrink-0">
                  <Bike className="h-10 w-10 text-indigo-500" />
                </div>
              }
            />
          ) : (
            <div className="h-28 w-28 rounded-full bg-indigo-500/15 border-4 border-indigo-500/40 flex items-center justify-center shrink-0">
              <Bike className="h-10 w-10 text-indigo-500" />
            </div>
          )}
          <div className="font-bold text-lg leading-tight">{nome}</div>
          {telefone && (
            <a
              href={`tel:${telefone.replace(/\D/g, "")}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Phone className="h-4 w-4" /> {telefone}
            </a>
          )}
        </div>

        <div className="flex justify-center">
          <ChatPedidoButton
            pedidoId={pedidoId}
            pedidoNumero={pedidoNumero}
            senderRole="loja"
            contraparteNome={nome}
          />
        </div>
      </div>
    </div>
  );
}
