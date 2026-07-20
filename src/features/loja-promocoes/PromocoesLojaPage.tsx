import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Megaphone, Send, Clock, CheckCircle2, XCircle } from "lucide-react";
import { LojaShell } from "@/components/LojaShell";
import { useMinhaLoja } from "@/hooks/use-loja";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { enviarPromocaoLoja } from "@/lib/promocoes.functions";

export function PromocoesLojaPage() {
  const { data: loja } = useMinhaLoja();
  const enviar = useServerFn(enviarPromocaoLoja);
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const { data: historico = [], isLoading } = useQuery({
    queryKey: ["promocoes-loja", loja?.id],
    enabled: !!loja?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("promocoes_lojas")
        .select("id, title, body, url, image_url, destinatarios, sent, status, erro, created_at, enviada_at")
        .eq("loja_id", loja!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (!loja?.id) throw new Error("Loja não carregada");
      return enviar({
        data: {
          loja_id: loja.id,
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || undefined,
          image_url: imageUrl.trim() || undefined,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(
        res.destinatarios === 0
          ? "Promoção registrada — nenhum cliente com notificações ativas na cidade ainda."
          : `Enviado para ${res.destinatarios} cliente(s) — ${res.sent} dispositivo(s).`,
      );
      setTitle("");
      setBody("");
      setUrl("");
      setImageUrl("");
      qc.invalidateQueries({ queryKey: ["promocoes-loja", loja?.id] });
    },
    onError: (e: any) => toast.error(e?.message || "Falha ao enviar"),
  });

  const podeEnviar =
    !!loja?.id &&
    title.trim().length >= 3 &&
    body.trim().length >= 3 &&
    !mut.isPending;

  return (
    <LojaShell title="Promoções">
      <div className="p-4 md:p-6 space-y-4 max-w-3xl">
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Nova promoção</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Envie uma notificação push para todos os clientes da sua cidade que ativaram avisos. Limite: 1 envio a cada 6h.
          </p>

          <div className="grid gap-3">
            <div>
              <Label>Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                placeholder="Ex: 🍕 Pizza grande por R$29,90 hoje!"
                maxLength={80}
              />
              <p className="text-xs text-muted-foreground mt-1">{title.length}/80</p>
            </div>
            <div>
              <Label>Mensagem</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, 300))}
                placeholder="Ex: Só hoje, das 18h às 22h. Peça agora e receba em até 40min."
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
                placeholder={`/loja/${loja?.catalogo_slug || loja?.slug || "sua-loja"}`}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Se vazio, abre o catálogo da sua loja.
              </p>
            </div>
            <div>
              <Label>Imagem (URL, opcional)</Label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => mut.mutate()} disabled={!podeEnviar} size="lg">
              <Send className="w-4 h-4 mr-2" />
              {mut.isPending ? "Enviando…" : "Enviar promoção"}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" /> Histórico
          </h3>
          <div className="divide-y">
            {isLoading && <div className="p-3 text-sm text-muted-foreground">Carregando…</div>}
            {!isLoading && historico.length === 0 && (
              <div className="p-3 text-sm text-muted-foreground">Nenhuma promoção enviada ainda.</div>
            )}
            {historico.map((p: any) => {
              const dt = new Date(p.created_at).toLocaleString("pt-BR");
              const icon =
                p.status === "enviada" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : p.status === "pending" ? (
                  <Clock className="w-4 h-4 text-amber-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                );
              return (
                <div key={p.id} className="py-3 text-sm space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {icon}
                      <span className="font-semibold truncate">{p.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{dt}</span>
                  </div>
                  <p className="text-muted-foreground pl-6">{p.body}</p>
                  <div className="pl-6 text-xs text-muted-foreground">
                    Alcance: {p.destinatarios} cliente(s) · dispositivos: {p.sent}
                    {p.erro && <> · <span className="text-red-500">{p.erro}</span></>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </LojaShell>
  );
}
