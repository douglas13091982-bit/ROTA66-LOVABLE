import { createFileRoute } from "@tanstack/react-router";

// Digital Asset Links para o TWA gerado no PWABuilder (Google Play).
// Servido em https://rotas66.com.br/.well-known/assetlinks.json
// Sem isso o TWA abre com a barra de endereço do Chrome visível.

const ASSET_LINKS = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "br.com.rotas66.www.twa",
      sha256_cert_fingerprints: [
        "D5:E3:3F:D3:A8:9A:4C:A5:82:24:BF:87:24:27:C4:3C:B4:20:BE:62:84:09:95:A9:0E:D1:AA:24:2A:48:21:F4",
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
