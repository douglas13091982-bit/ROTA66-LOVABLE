import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, MessageCircle, RefreshCw } from "lucide-react";
import {
  useSystemAlerts,
  useSystemAlertsConfig,
  useResolverAlerta,
  useUpdateAlertsConfig,
  type SystemAlertsConfig,
} from "./hooks/use-system-alerts";
import { useBranding } from "@/hooks/use-branding";
import { formatDateTime } from "@/lib/format";

function severityBadge(sev: "warn" | "crit") {
  if (sev === "crit") return <Badge variant="destructive">Crítico</Badge>;
  return <Badge className="bg-amber-500 hover:bg-amber-600">Atenção</Badge>;
}

export function AdminAlertasPage() {
  const [includeResolved, setIncludeResolved] = useState(false);
  const { data: alerts = [], isLoading, refetch } = useSystemAlerts(includeResolved);
  const { data: config } = useSystemAlertsConfig();
  const resolver = useResolverAlerta();
  const updateCfg = useUpdateAlertsConfig();
  const { suporteWhatsapp } = useBranding();
  const [form, setForm] = useState<SystemAlertsConfig | null>(null);

  const cfg = form ?? config;

  const ativos = alerts.filter((a) => !a.resolvido);
  const criticos = ativos.filter((a) => a.severidade === "crit").length;

  const waLink = suporteWhatsapp
    ? `https://wa.me/${suporteWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Alertas críticos no sistema: ${criticos}`,
      )}`
    : null;

  return (
    <AdminShell title="Alertas do sistema">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm text-muted-foreground">
              Monitoramento automático do banco. Atualiza a cada 5 min.
            </p>
            <p className="text-sm mt-1">
              <strong>{ativos.length}</strong> alerta(s) ativo(s) — <strong>{criticos}</strong>{" "}
              crítico(s).
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
          </Button>
          {waLink && criticos > 0 && (
            <Button asChild className="bg-green-600 hover:bg-green-700">
              <a href={waLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4 mr-2" /> Avisar no WhatsApp
              </a>
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Limites de alerta</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cfg ? (
              <>
                <div>
                  <Label>Query média crítica (ms)</Label>
                  <Input
                    type="number"
                    value={cfg.query_mean_ms_crit}
                    onChange={(e) =>
                      setForm({ ...cfg, query_mean_ms_crit: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Query máx. crítica (ms)</Label>
                  <Input
                    type="number"
                    value={cfg.query_max_ms_crit}
                    onChange={(e) => setForm({ ...cfg, query_max_ms_crit: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Conexões aviso</Label>
                  <Input
                    type="number"
                    value={cfg.connections_warn}
                    onChange={(e) => setForm({ ...cfg, connections_warn: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Conexões crítico</Label>
                  <Input
                    type="number"
                    value={cfg.connections_crit}
                    onChange={(e) => setForm({ ...cfg, connections_crit: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Pedidos travados (min)</Label>
                  <Input
                    type="number"
                    value={cfg.pedidos_pagamento_pendente_min}
                    onChange={(e) =>
                      setForm({
                        ...cfg,
                        pedidos_pagamento_pendente_min: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => form && updateCfg.mutate(form)}
                    disabled={!form || updateCfg.isPending}
                  >
                    Salvar limites
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <Button
            variant={includeResolved ? "outline" : "default"}
            size="sm"
            onClick={() => setIncludeResolved(false)}
          >
            Ativos
          </Button>
          <Button
            variant={includeResolved ? "default" : "outline"}
            size="sm"
            onClick={() => setIncludeResolved(true)}
          >
            Todos (com histórico)
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground flex flex-col items-center gap-2">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              Nenhum alerta. Sistema saudável.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <Card key={a.id} className={a.resolvido ? "opacity-60" : ""}>
                <CardContent className="py-3 flex items-start gap-3">
                  <AlertTriangle
                    className={
                      a.severidade === "crit"
                        ? "h-5 w-5 text-destructive shrink-0 mt-0.5"
                        : "h-5 w-5 text-amber-500 shrink-0 mt-0.5"
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {severityBadge(a.severidade)}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(a.created_at)}
                      </span>
                      {a.resolvido && <Badge variant="secondary">Resolvido</Badge>}
                    </div>
                    <p className="text-sm mt-1 break-words">{a.mensagem}</p>
                    {a.metadata?.query && (
                      <pre className="text-[10px] text-muted-foreground mt-1 whitespace-pre-wrap break-all bg-muted/40 rounded px-2 py-1">
                        {a.metadata.query}
                      </pre>
                    )}
                  </div>
                  {!a.resolvido && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolver.mutate(a.id)}
                      disabled={resolver.isPending}
                    >
                      Resolver
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
