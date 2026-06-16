import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Save,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  obterStatusTokenPlataforma,
  salvarTokenPlataforma,
  removerTokenPlataforma,
  salvarPublicKeyPlataforma,
  salvarWebhookSecretPlataforma,
} from "@/lib/mensalidades-mp.functions";

function copy(value: string, label: string) {
  if (!value) return;
  navigator.clipboard.writeText(value);
  toast.success(`${label} copiado`);
}

export function MercadoPagoPlataformaSection() {
  const qc = useQueryClient();
  const obter = useServerFn(obterStatusTokenPlataforma);
  const salvar = useServerFn(salvarTokenPlataforma);
  const remover = useServerFn(removerTokenPlataforma);
  const salvarPk = useServerFn(salvarPublicKeyPlataforma);
  const salvarSecret = useServerFn(salvarWebhookSecretPlataforma);

  const { data, isLoading } = useQuery({
    queryKey: ["plataforma-mp-status"],
    queryFn: () => obter(),
  });

  const [token, setToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [webhookSecretInput, setWebhookSecretInput] = useState("");
  const [mostrarSecret, setMostrarSecret] = useState(false);

  useEffect(() => {
    setToken("");
    setPublicKey((data as any)?.public_key ?? "");
    setWebhookSecretInput((data as any)?.webhook_secret ?? "");
  }, [data]);

  const mSalvar = useMutation({
    mutationFn: (t: string) => salvar({ data: { access_token: t } }),
    onSuccess: (r: any) => {
      toast.success(`Token salvo (${r?.nickname ?? "ok"})`);
      qc.invalidateQueries({ queryKey: ["plataforma-mp-status"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });
  const mRemover = useMutation({
    mutationFn: () => remover(),
    onSuccess: () => {
      toast.success("Token removido");
      qc.invalidateQueries({ queryKey: ["plataforma-mp-status"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });
  const mSalvarPk = useMutation({
    mutationFn: (k: string) => salvarPk({ data: { public_key: k } }),
    onSuccess: () => {
      toast.success("Public key salva");
      qc.invalidateQueries({ queryKey: ["plataforma-mp-status"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });
  const mRotacionar = useMutation({
    mutationFn: () => rotacionar(),
    onSuccess: () => {
      toast.success("Nova chave de webhook gerada");
      qc.invalidateQueries({ queryKey: ["plataforma-mp-status"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  const webhookUrl = (data as any)?.webhook_url ?? "";
  const webhookSecret = (data as any)?.webhook_secret ?? "";

  return (
    <section className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div>
        <h2 className="font-display text-xl mb-1">Mercado Pago da plataforma</h2>
        <p className="text-sm text-muted-foreground">
          <strong>Uma única conta MP</strong> recebe TODOS os pagamentos da plataforma:
          mensalidades das lojas + recargas/mensalidades dos entregadores. Crie uma aplicação em
          Mercado Pago → Suas integrações e cole as credenciais de produção abaixo.
        </p>
      </div>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <>
          {/* Status */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Status</h3>
            {(data as any)?.configurado ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  {(data as any).valido ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span>
                        Conectado{(data as any).nickname ? ` como ${(data as any).nickname}` : ""}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <span>Token inválido — {(data as any).erro ?? "verifique"}</span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (confirm("Remover token? Pagamentos online ficarão desativados.")) mRemover.mutate();
                  }}
                  disabled={mRemover.isPending}
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider bg-card border border-border rounded-md hover:bg-background"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover token
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-500 text-sm">
                <AlertTriangle className="h-4 w-4" />
                Nenhum token configurado — pagamentos online estão desativados.
              </div>
            )}
          </div>

          {/* Access token */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Access token (produção)
            </label>
            <p className="text-xs text-muted-foreground">
              Começa com <code>APP_USR-</code>. Usado no servidor para criar cobranças PIX/cartão.
            </p>
            <input
              type="password"
              placeholder="APP_USR-..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono"
            />
            <button
              onClick={() => token.trim() && mSalvar.mutate(token.trim())}
              disabled={mSalvar.isPending || token.trim().length < 10}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-xs tracking-wider rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {mSalvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar e testar
            </button>
          </div>

          {/* Public key */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Public key (opcional)
            </label>
            <p className="text-xs text-muted-foreground">
              Começa com <code>APP_USR-</code> (formato chave pública). Usada em integrações de checkout no
              navegador. Pode deixar em branco se usar apenas Checkout Pro/PIX.
            </p>
            <input
              type="text"
              placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono"
            />
            <button
              onClick={() => mSalvarPk.mutate(publicKey.trim())}
              disabled={mSalvarPk.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-md text-xs font-bold uppercase tracking-wider hover:bg-background"
            >
              {mSalvarPk.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar public key
            </button>
          </div>

          {/* Webhook URL (ÚNICA — cobre lojas + entregadores) */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              URL única do webhook
            </label>
            <p className="text-xs text-muted-foreground">
              Cadastre <strong>apenas esta URL</strong> em Mercado Pago → Sua aplicação → Webhooks,
              evento <strong>"Pagamentos"</strong>. Ela recebe automaticamente tanto as mensalidades
              das lojas quanto as recargas dos entregadores.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={webhookUrl}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-xs font-mono"
              />
              <button
                onClick={() => copy(webhookUrl, "URL")}
                className="px-3 py-2 bg-card border border-border rounded-md hover:bg-background"
                title="Copiar"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Webhook secret */}
          {(data as any)?.configurado && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Chave secreta do webhook
              </label>
              <p className="text-xs text-muted-foreground">
                Cole esta chave em Mercado Pago → Webhooks → <strong>Assinatura secreta</strong>. Usada para
                validar a assinatura HMAC dos eventos recebidos.
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  type={mostrarSecret ? "text" : "password"}
                  value={webhookSecret}
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-xs font-mono"
                />
                <button
                  onClick={() => setMostrarSecret((v) => !v)}
                  className="px-3 py-2 bg-card border border-border rounded-md hover:bg-background"
                  title={mostrarSecret ? "Ocultar" : "Mostrar"}
                >
                  {mostrarSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => copy(webhookSecret, "Chave")}
                  className="px-3 py-2 bg-card border border-border rounded-md hover:bg-background"
                  title="Copiar"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => {
                  if (
                    confirm(
                      "Gerar uma nova chave? Você precisará atualizá-la em Mercado Pago, senão os webhooks serão rejeitados.",
                    )
                  )
                    mRotacionar.mutate();
                }}
                disabled={mRotacionar.isPending}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider bg-card border border-border rounded-md hover:bg-background"
              >
                {mRotacionar.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Gerar nova chave
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
