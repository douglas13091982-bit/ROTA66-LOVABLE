import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { testarConexaoMp } from "@/lib/mercadopago.functions";
import { ExternalLink, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface Props {
  lojaId: string;
}

interface ConfigState {
  configurado: boolean;
  ativo: boolean;
  public_key: string;
  access_token_masked: string;
  webhook_secret_masked: string;
  webhook_secret_configurado: boolean;
}

export function MercadoPagoConfig({ lojaId }: Props) {
  const [cfg, setCfg] = useState<ConfigState | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [publicKey, setPublicKey] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const testar = useServerFn(testarConexaoMp);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/public/mp-webhook/${lojaId}`
      : `/api/public/mp-webhook/${lojaId}`;

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_mp_config_dono", { _loja_id: lojaId });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const row = (data && data[0]) ?? null;
    if (row) {
      setCfg({
        configurado: true,
        ativo: row.ativo,
        public_key: row.public_key,
        access_token_masked: row.access_token_masked,
        webhook_secret_masked: row.webhook_secret_masked ?? "",
        webhook_secret_configurado: !!row.webhook_secret_configurado,
      });
      setAtivo(row.ativo);
    } else {
      setCfg({
        configurado: false,
        ativo: false,
        public_key: "",
        access_token_masked: "",
        webhook_secret_masked: "",
        webhook_secret_configurado: false,
      });
      setEditing(true);
    }
  };

  useEffect(() => {
    if (lojaId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey.trim() || !accessToken.trim()) {
      toast.error("Preencha as duas credenciais");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).rpc("salvar_mp_config", {
      _loja_id: lojaId,
      _access_token: accessToken.trim(),
      _public_key: publicKey.trim(),
      _ativo: ativo,
      _webhook_secret: webhookSecret.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Credenciais salvas");
    setAccessToken("");
    setPublicKey("");
    setWebhookSecret("");
    setEditing(false);
    load();
  };




  const handleTestar = async () => {
    if (!accessToken.trim()) {
      toast.error("Cole o Access Token para testar");
      return;
    }
    setTesting(true);
    try {
      const res = await testar({ data: { loja_id: lojaId, access_token: accessToken.trim() } });
      if (res.ok) toast.success(`Conexão ok${res.nickname ? ` (${res.nickname})` : ""}`);
      else toast.error(`Falhou: ${res.error}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="font-display text-lg tracking-wide flex items-center gap-2">💳 Pagamentos online (Mercado Pago)</div>
        <p className="text-xs text-muted-foreground mt-1">
          Conecte sua conta do Mercado Pago para receber pagamentos Pix e Cartão direto pelo catálogo. O dinheiro cai
          na sua conta MP — nenhuma taxa adicional cobrada por nós.
        </p>
        <a
          href="https://www.mercadopago.com.br/developers/panel/app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
        >
          Onde pegar minhas credenciais <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {cfg?.configurado && !editing && (
        <div className="bg-background border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="font-bold">Conta conectada</span>
            {!cfg.ativo && (
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
                Desativado
              </span>
            )}
          </div>
          <div className="text-xs space-y-1 text-muted-foreground">
            <div>
              <span className="uppercase tracking-wider font-bold mr-2">Public key:</span>
              <code className="text-foreground">{cfg.public_key}</code>
            </div>
            <div>
              <span className="uppercase tracking-wider font-bold mr-2">Access token:</span>
              <code className="text-foreground">{cfg.access_token_masked}</code>
            </div>
            <div>
              <span className="uppercase tracking-wider font-bold mr-2">Chave do webhook:</span>
              <code className="text-foreground">{cfg.webhook_secret_masked || "—"}</code>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setPublicKey(cfg.public_key);
              setAccessToken("");
              setWebhookSecret("");
              setAtivo(cfg.ativo);
            }}
            className="text-xs font-bold uppercase tracking-wider text-primary hover:underline"
          >
            Editar credenciais
          </button>
        </div>
      )}

      {editing && (
        <form onSubmit={handleSave} className="bg-background border border-border rounded-lg p-4 space-y-3">
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
              Public Key
            </span>
            <input
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder="APP_USR-..."
              className="w-full bg-card border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
              Access Token
            </span>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="APP_USR-..."
              className="w-full bg-card border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
            <span className="block text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Mantemos seu token criptografado. Ele nunca aparece no navegador.
            </span>
          </label>
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
              Chave secreta do Webhook
            </span>
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={cfg?.webhook_secret_configurado ? "•••••••••• (deixe em branco para manter)" : "Cole a chave gerada pelo MP"}
              className="w-full bg-card border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
            />
            <span className="block text-[11px] text-muted-foreground mt-1">
              O Mercado Pago gera essa chave ao criar o webhook em <em>Suas integrações → Webhooks → Configurar notificações</em>. Copie de lá e cole aqui.
            </span>
          </label>
          <label className="flex items-center justify-between gap-3 p-3 bg-card rounded-md border border-border">
            <div>
              <div className="font-bold uppercase tracking-wider text-xs">Aceitar pagamentos</div>
              <div className="text-[11px] text-muted-foreground">Habilita Pix e Cartão no catálogo</div>
            </div>
            <button
              type="button"
              onClick={() => setAtivo(!ativo)}
              className={`relative shrink-0 w-12 h-6 rounded-full transition-colors ${ativo ? "bg-primary" : "bg-border"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 bg-background rounded-full transition-all ${ativo ? "left-[calc(100%-1.375rem)]" : "left-0.5"}`}
              />
            </button>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-gradient-red shadow-red text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={handleTestar}
              disabled={testing || !accessToken.trim()}
              className="px-4 py-2 bg-muted text-xs font-bold uppercase tracking-wider rounded-md hover:bg-muted/70 disabled:opacity-50"
            >
              {testing ? "Testando..." : "Testar conexão"}
            </button>
            {cfg?.configurado && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setAccessToken("");
                  setPublicKey("");
                }}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground bg-muted/30 rounded p-2 space-y-1">
            <a
              href="https://www.mercadopago.com.br/developers/panel/app/1391198286441309/webhooks"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline font-bold"
            >
              Abrir configuração de Webhooks no Mercado Pago <ExternalLink className="h-3 w-3" />
            </a>
            <div>
              <strong>1.</strong> No painel do MP, em <em>Suas integrações → Webhooks → Configurar notificações</em>,
              cole esta URL e selecione o evento <strong>"Pagamentos"</strong>:
            </div>
            <code className="block break-all text-foreground bg-background/60 rounded px-2 py-1">
              {webhookUrl}
            </code>
            <div>
              <strong>2.</strong> O MP vai gerar uma <strong>Chave secreta</strong> — copie e cole no campo acima.
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
