import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/hooks/use-branding";
import { MapPin } from "lucide-react";

export const Route = createFileRoute("/clientes/")({
  component: ClientesIndex,
  head: () => ({
    meta: [
      { title: "Encontre lojas perto de você" },
      { name: "description", content: "Descubra lojas, restaurantes e mercados disponíveis na sua cidade." },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#ffffff" },
    ],
  }),
});

function ClientesIndex() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "no-city" | "guest">("loading");
  const { logoUrl, nomeSistema } = useBranding();

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

  return (
    <div className="catalogo-clean min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        <img src={logoUrl} alt={nomeSistema} className="h-10 w-auto object-contain mb-6" />
        {status === "loading" && (
          <>
            <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Localizando sua cidade…</p>
          </>
        )}
        {status === "guest" && (
          <>
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="font-display text-lg tracking-tight mb-2">Entre ou cadastre-se</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Faça login para acessar as lojas da sua cidade.
            </p>
            <a
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"
            >
              Fazer login
            </a>
          </>
        )}
        {status === "no-city" && (
          <>
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="font-display text-lg tracking-tight mb-2">Endereço não encontrado</h2>
            <p className="text-sm text-muted-foreground">
              Seu cadastro não possui uma cidade vinculada. Atualize seu endereço no perfil.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

