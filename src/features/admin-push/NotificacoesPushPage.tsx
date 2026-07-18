import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bell, Send, Search, Users, Radio, User, Lock, History, CheckCircle2, XCircle, Clock } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  listarEntregadoresParaPush,
  enviarPushEntregadores,
  listarPushLogs,
} from "@/lib/push-admin.functions";

type Filtro = "todos" | "cidade" | "online" | "selecionados";

export function NotificacoesPushPage() {
  const { roles } = useAuth();
  const isSuper = roles.includes("super_admin");
  return (
    <AdminShell title="Notificações push">
      {isSuper ? (
        <Conteudo />
      ) : (
        <div className="max-w-md mx-auto mt-12 text-center pp-card rounded-2xl p-8">
          <Lock className="h-10 w-10 mx-auto text-white/40 mb-3" />
          <div className="text-lg font-semibold text-white mb-1">Acesso restrito</div>
          <div className="text-sm text-white/60">Apenas super admin ou franqueado.</div>
        </div>
      )}
    </AdminShell>
  );
}

function Conteudo() {
  const listar = useServerFn(listarEntregadoresParaPush);
  const enviar = useServerFn(enviarPushEntregadores);
  const listarLogs = useServerFn(listarPushLogs);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-push-entregadores"],
    queryFn: () => listar(),
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["admin-push-logs"],
    queryFn: () => listarLogs(),
    refetchInterval: 5000,
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/entregador/disponiveis");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const entregadores = data?.entregadores ?? [];
  const onlineSet = useMemo(() => new Set(data?.onlineIds ?? []), [data?.onlineIds]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return entregadores;
    return entregadores.filter(
      (e) => e.nome.toLowerCase().includes(q) || e.phone.toLowerCase().includes(q)
    );
  }, [entregadores, busca]);

  const contagemPrevista = useMemo(() => {
    if (filtro === "todos" || filtro === "cidade") return entregadores.length;
    if (filtro === "online") return onlineSet.size;
    return selecionados.size;
  }, [filtro, entregadores.length, onlineSet.size, selecionados.size]);

  const mut = useMutation({
    mutationFn: async () => {
      return enviar({
        data: {
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || undefined,
          filtro,
          city_id: null,
          user_ids: filtro === "selecionados" ? Array.from(selecionados) : undefined,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(`Enviado para ${res.destinatarios} entregador(es) — ${res.sent} dispositivo(s)`);
      setTitle("");
      setBody("");
      setSelecionados(new Set());
      qc.invalidateQueries({ queryKey: ["admin-push-logs"] });
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao enviar"),
  });

  const podeEnviar =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    !mut.isPending &&
    (filtro !== "selecionados" || selecionados.size > 0);

  const toggleTodos = () => {
    if (selecionados.size === filtrados.length) setSelecionados(new Set());
    else setSelecionados(new Set(filtrados.map((e) => e.id)));
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <div className="pp-glass rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Nova notificação</h2>
        </div>

        <div className="grid gap-3">
          <div>
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 80))}
              placeholder="Ex: Bônus liberado hoje!"
              maxLength={80}
            />
            <p className="text-xs text-muted-foreground mt-1">{title.length}/80</p>
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 300))}
              placeholder="Ex: A cada corrida entre 18h e 22h você ganha +R$2 de bônus."
              maxLength={300}
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">{body.length}/300</p>
          </div>
          <div>
            <Label>Link ao tocar (opcional)</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/entregador/disponiveis"
            />
          </div>
        </div>
      </div>

      <div className="pp-glass rounded-xl p-5 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" /> Para quem enviar
        </h3>
        <RadioGroup value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="todos" id="f-todos" />
            <span>Todos os entregadores {data?.cityId ? "da minha cidade" : ""} ({entregadores.length})</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="online" id="f-online" />
            <Radio className="w-3 h-3 text-green-500" />
            <span>Somente online agora ({onlineSet.size})</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <RadioGroupItem value="selecionados" id="f-sel" />
            <User className="w-3 h-3" />
            <span>Selecionar manualmente ({selecionados.size})</span>
          </label>
        </RadioGroup>

        {filtro === "selecionados" && (
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou telefone…"
                className="h-9"
              />
              <Button variant="outline" size="sm" onClick={toggleTodos} type="button">
                {selecionados.size === filtrados.length ? "Limpar" : "Todos"}
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto border rounded-lg divide-y">
              {isLoading && <div className="p-3 text-sm text-muted-foreground">Carregando…</div>}
              {!isLoading && filtrados.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">Nenhum entregador encontrado.</div>
              )}
              {filtrados.map((e) => {
                const checked = selecionados.has(e.id);
                const online = onlineSet.has(e.id);
                return (
                  <label
                    key={e.id}
                    className="flex items-center gap-3 p-2.5 hover:bg-muted/40 cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        const next = new Set(selecionados);
                        if (v) next.add(e.id);
                        else next.delete(e.id);
                        setSelecionados(next);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{e.nome}</div>
                      {e.phone && (
                        <div className="text-xs text-muted-foreground">{e.phone}</div>
                      )}
                    </div>
                    {online && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-semibold">
                        online
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="pp-glass rounded-xl p-5 flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Alcance estimado: <strong className="text-foreground">{contagemPrevista}</strong> entregador(es)
        </div>
        <Button onClick={() => mut.mutate()} disabled={!podeEnviar} size="lg">
          <Send className="w-4 h-4 mr-2" />
          {mut.isPending ? "Enviando…" : "Enviar notificação"}
        </Button>
      </div>
    </div>
  );
}
