import { useQuery } from "@tanstack/react-query";
import { Bike } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AvatarImg } from "@/components/AvatarImg";

export function EntregadorNomeBadge({ pedidoId }: { pedidoId: string }) {
  const { data } = useQuery({
    queryKey: ["entregador-pedido", pedidoId],
    enabled: !!pedidoId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_entregador_pedido", { _pedido_id: pedidoId });
      if (error) throw error;
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    },
  });
  if (!data?.full_name) return null;
  const avatar = (data as any).avatar_url as string | null | undefined;
  return (
    <div className="mt-1 inline-flex items-center gap-1.5 pl-0.5 pr-1.5 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold uppercase tracking-wider rounded max-w-full">
      {avatar ? (
        <AvatarImg src={avatar} alt={data.full_name} className="h-4 w-4 rounded-full object-cover border border-emerald-500/30" fallback={<Bike className="h-2.5 w-2.5 shrink-0" />} />
      ) : (
        <Bike className="h-2.5 w-2.5 shrink-0" />
      )}
      <span className="truncate">{data.full_name}</span>
    </div>
  );
}

