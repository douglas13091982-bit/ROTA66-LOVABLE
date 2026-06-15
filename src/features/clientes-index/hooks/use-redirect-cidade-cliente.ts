import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { ClientesIndexStatus } from "../logic/types";

export function useRedirectCidadeCliente() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ClientesIndexStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!auth.user) {
        setStatus("guest");
        return;
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("cidade, estado")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (cancelled) return;
      const c = (prof as any)?.cidade as string | null | undefined;
      const uf = (prof as any)?.estado as string | null | undefined;
      if (c && c.trim()) {
        navigate({
          to: "/clientes/$cidade",
          params: { cidade: encodeURIComponent(c.trim()) },
          search: uf ? { uf: uf.trim().toUpperCase() } : {},
          replace: true,
        });
      } else {
        setStatus("no-city");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return status;
}
