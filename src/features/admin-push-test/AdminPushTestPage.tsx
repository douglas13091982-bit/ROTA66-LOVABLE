import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { enviarPushTesteOneSignal, type OneSignalTestResult } from "@/lib/onesignal-test.functions";

type EntregadorOpt = { id: string; full_name: string | null; phone: string | null };

export function AdminPushTestPage() {
  const enviar = useServerFn(enviarPushTesteOneSignal);

  const { data: entregadores = [], isLoading: loadingList } = useQuery({
    queryKey: ["admin-push-test-entregadores"],
    queryFn: async (): Promise<EntregadorOpt[]> => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "entregador");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", ids);
      return (profs ?? [])
        .map((p: any) => ({ id: p.id, full_name: p.full_name, phone: p.phone }))
        .sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
    },
  });

  const [entregadorId, setEntregadorId] = useState("");
  const [title, setTitle] = useState("Teste OneSignal");
  const [body, setBody] = useState("Push de teste enviado pelo admin.");
  const [url, setUrl] = useState("/entregador/ativos");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<OneSignalTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selecionado = useMemo(
    () => entregadores.find((e) => e.id === entregadorId),
    [entregadores, entregadorId]
  );

  async function handleSend() {
    if (!entregadorId) {
      toast.error("Selecione um entregador");
      return;
    }
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await enviar({
        data: { entregador_id: entregadorId, title, body, url },
      });
      setResult(res);
      if (res.ok) toast.success(`OneSignal respondeu ${res.status}`);
      else toast.error(`OneSignal retornou ${res.status}`);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <AdminShell title="Push de teste (OneSignal)">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>Entregador</Label>
            <select
              value={entregadorId}
              onChange={(e) => setEntregadorId(e.target.value)}
              disabled={loadingList}
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">— selecione —</option>
              {entregadores.map((e) => (
                <option key={e.id} value={e.id}>
                  {(e.full_name ?? "(sem nome)") + (e.phone ? ` · ${e.phone}` : "")}
                </option>
              ))}
            </select>
            {selecionado && (
              <p className="text-xs text-muted-foreground">
                external_id enviado: <code>{selecionado.id}</code>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} rows={3} />
          </div>

          <div className="space-y-2">
            <Label>URL ao clicar (caminho dentro do app)</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/entregador/ativos" />
          </div>

          <Button onClick={handleSend} disabled={sending || !entregadorId} className="w-full">
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar push
          </Button>
        </Card>

        {(result || error) && (
          <Card className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Retorno do OneSignal</h3>
              {result && (
                <span
                  className={
                    "text-xs px-2 py-1 rounded " +
                    (result.ok ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400")
                  }
                >
                  HTTP {result.status} {result.ok ? "OK" : "ERR"}
                </span>
              )}
            </div>
            {error && <pre className="text-xs text-red-400 whitespace-pre-wrap">{error}</pre>}
            {result && (
              <pre className="text-xs bg-black/40 p-3 rounded overflow-auto max-h-[420px] whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
            {result?.ok && (result.response as any)?.recipients === 0 && (
              <p className="text-xs text-amber-400">
                OneSignal aceitou a requisição mas não encontrou nenhum dispositivo com
                <code className="mx-1">external_id = {selecionado?.id}</code>. Isso significa
                que o entregador ainda não abriu o APK depois de logado, ou o bridge nativo
                não chamou <code>OneSignal.login(userId)</code>.
              </p>
            )}
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
