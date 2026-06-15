import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type AdminArea =
  | "lojas"
  | "entregadores"
  | "financeiro"
  | "creditos"
  | "tarifas"
  | "roteirizacao"
  | "branding"
  | "anuncios"
  | "notificacao_som"
  | "pedidos"
  | "app_apk";

type Row = { area: string; can_write: boolean; is_super: boolean };

export function useAdminPermissoes() {
  const { user, roles } = useAuth();
  const isSuper = roles.includes("super_admin");
  const isAdmin = roles.includes("admin");

  const q = useQuery({
    queryKey: ["minhas-areas-admin", user?.id],
    enabled: !!user && (isSuper || isAdmin),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("minhas_areas_admin" as any);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const rows = q.data ?? [];
  const map = new Map<string, boolean>(rows.map((r) => [r.area, r.can_write]));

  const can = (area: AdminArea) => isSuper || map.has(area);
  const canWrite = (area: AdminArea) => isSuper || map.get(area) === true;

  return {
    loading: q.isLoading,
    isSuper,
    can,
    canWrite,
    areas: rows.map((r) => r.area as AdminArea),
  };
}
