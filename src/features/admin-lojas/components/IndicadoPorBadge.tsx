import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function IndicadoPorBadge({ entregadorId }: { entregadorId: string | null | undefined }) {
  const { data } = useQuery({
    queryKey: ["indicador-perfil", entregadorId],
    enabled: !!entregadorId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, codigo_indicacao")
        .eq("id", entregadorId!)
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });

  if (!entregadorId) return null;

  return (
    <div className="mb-3 inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-1 text-[11px] text-amber-200">
      <UserPlus className="h-3 w-3" />
      <span>
        Indicado por <strong>{data?.full_name || "—"}</strong>
        {data?.codigo_indicacao && <span className="opacity-70"> ({data.codigo_indicacao})</span>}
      </span>
    </div>
  );
}
