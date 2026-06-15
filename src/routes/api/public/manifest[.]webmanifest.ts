import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Manifest dinâmico do PWA — usa o nome do sistema e a logo configurados
// no painel Super Adm, garantindo que o app instalado fique idêntico à
// identidade visual atual.

export const Route = createFileRoute("/api/public/manifest.webmanifest")({
  server: {
    handlers: {
      GET: async () => {
        let nomeSistema = "ROTA 66";
        try {
          const { data } = await supabaseAdmin
            .from("config_branding")
            .select("nome_sistema")
            .limit(1)
            .maybeSingle();
          const n = (data as { nome_sistema: string | null } | null)?.nome_sistema;
          if (n && n.trim()) nomeSistema = n.trim();
        } catch (e) {
          console.error("[manifest] erro lendo branding:", e);
        }

        const manifest = {
          name: `${nomeSistema} — Entregador`,
          short_name: nomeSistema,
          description: `App do entregador ${nomeSistema} — gerencie suas entregas em tempo real.`,
          start_url: "/entregador",
          scope: "/",
          id: "/entregador",
          display: "standalone",
          orientation: "portrait",
          background_color: "#132b4f",
          theme_color: "#cc2229",
          lang: "pt-BR",
          categories: ["business", "productivity"],
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        };

        return new Response(JSON.stringify(manifest), {
          status: 200,
          headers: {
            "Content-Type": "application/manifest+json; charset=utf-8",
            "Cache-Control": "public, max-age=300, must-revalidate",
          },
        });
      },
    },
  },
});
