import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { permsToPayload, type AdminRow, type PermState } from "../logic/perms";

const QK = ["listar-admins"];

export function useAdmins(enabled: boolean) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QK,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("listar_admins" as any);
      if (error) throw error;
      return (data ?? []) as AdminRow[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: QK });

  const conceder = useMutation({
    mutationFn: async ({ email, perms }: { email: string; perms: PermState }) => {
      const { error } = await supabase.rpc("conceder_admin" as any, {
        _email: email.trim(),
        _permissoes: permsToPayload(perms),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acesso de admin atualizado");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao conceder acesso"),
  });

  const revogar = useMutation({
    mutationFn: async (user_id: string) => {
      const { error } = await supabase.rpc("revogar_admin" as any, { _user_id: user_id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acesso revogado");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao revogar"),
  });

  return { ...query, conceder, revogar, invalidate };
}
