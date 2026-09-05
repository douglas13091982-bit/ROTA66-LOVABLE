import { defineMcp, auth } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";

const supabaseUrl =
  process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "";

export default defineMcp({
  name: "rota66-mcp",
  title: "ROTA 66 MCP",
  version: "0.1.0",
  instructions:
    "Ferramentas do ROTA 66 (plataforma de entregas). Use `echo` para verificar a conectividade.",
  // Exige token OAuth/JWT válido do backend do projeto — sem login, nenhuma tool é chamável.
  auth: auth.oauth.issuer({
    issuer: `${supabaseUrl}/auth/v1`,
    jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
    acceptedAudiences: ["authenticated"],
    resourceName: "ROTA 66 MCP",
  }),
  tools: [echoTool],
});
