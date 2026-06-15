import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Serve a logo configurada no painel Super Adm como ícone do PWA.
// Usado pelo manifest dinâmico para que o ícone do app instalado
// seja sempre idêntico à logo do sistema.

export const Route = createFileRoute("/api/public/pwa-icon.png")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { data, error } = await supabaseAdmin
            .from("config_branding")
            .select("logo_data_url")
            .limit(1)
            .maybeSingle();

          if (error) throw error;

          const dataUrl = (data as { logo_data_url: string | null } | null)?.logo_data_url;
          if (dataUrl && dataUrl.startsWith("data:")) {
            const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              const mime = match[1] || "image/png";
              const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
              return new Response(bytes, {
                status: 200,
                headers: {
                  "Content-Type": mime,
                  // Cache curto para refletir trocas de logo rapidamente
                  "Cache-Control": "public, max-age=300, must-revalidate",
                },
              });
            }
          }
        } catch (e) {
          console.error("[pwa-icon] erro lendo branding:", e);
        }

        // Fallback — redireciona para o ícone estático
        return new Response(null, {
          status: 302,
          headers: { Location: "/icons/icon-512.png" },
        });
      },
    },
  },
});
