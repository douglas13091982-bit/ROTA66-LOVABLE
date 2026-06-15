import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, CheckCircle2, AlertTriangle, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  obterStatusTokenPlataforma,
  salvarTokenPlataforma,
  removerTokenPlataforma,
} from "@/lib/mensalidades-mp.functions";

export function MercadoPagoPlataformaSection() {
  const qc = useQueryClient();
  const obter = useServerFn(obterStatusTokenPlataforma);
  const salvar = useServerFn(salvarTokenPlataforma);
  const remover = useServerFn(removerTokenPlataforma);

  const { data, isLoading } = useQuery({
    queryKey: ["plataforma-mp-status"],
    queryFn: () => obter(),
  });

  const [token, setToken] = useState("");
  useEffect(() => {
    setToken("");
  }, [data?.configurado]);

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

  return (
    <section className="bg-card border border-border rounded-lg p-6">
      <h2 className="font-display text-xl mb-1">Mercado Pago da plataforma</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Access token usado para receber as <strong>mensalidades e tarifas por pedido</strong> das lojas. Crie uma
        aplicação em Mercado Pago → Suas integrações e cole o <code>access_token</code> de produção aqui.
      </p>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : data?.configurado ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            {data.valido ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>
                  Conectado{data.nickname ? ` como ${data.nickname}` : ""}
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span>Token inválido — {data.erro ?? "verifique"}</span>
              </>
            )}
          </div>
          <button
            onClick={() => {
              if (confirm("Remover token? Lojas não conseguirão pagar online.")) mRemover.mutate();
            }}
            disabled={mRemover.isPending}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider bg-card border border-border rounded-md hover:bg-background"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remover
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-amber-500 text-sm mb-4">
          <AlertTriangle className="h-4 w-4" />
          Nenhum token configurado — pagamentos online estão desativados.
        </div>
      )}

      <div className="mt-4 space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Atualizar / definir access token
        </label>
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
    </section>
  );
}
