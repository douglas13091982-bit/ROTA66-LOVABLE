import { createFileRoute } from "@tanstack/react-router";

// Digital Asset Links para o TWA gerado no PWABuilder (Google Play).
// Servido em https://rotas66.com.br/.well-known/assetlinks.json
// Sem isso o TWA abre com a barra de endereço do Chrome visível.

const ASSET_LINKS = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "br.com.rotas66.app",
      sha256_cert_fingerprints: [
        "A8:64:1C:D4:94:0C:13:FA:84:26:2F:8D:DF:5E:CA:60:AA:60:BD:DF:F0:FA:3F:E0:FC:7F:1E:5E:56:27:1C:FF",
      ],
    },
  },
];

export const Route = createFileRoute("/.well-known/assetlinks.json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify(ASSET_LINKS), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        }),
    },
  },
});
