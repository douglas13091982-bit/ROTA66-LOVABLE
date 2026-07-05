import { defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";

export default defineMcp({
  name: "rota66-mcp",
  title: "ROTA 66 MCP",
  version: "0.1.0",
  instructions:
    "Ferramentas do ROTA 66 (plataforma de entregas). Use `echo` para verificar a conectividade.",
  tools: [echoTool],
});
