import { Check, Copy, Loader2, Wallet, History } from "lucide-react";
import { useState } from "react";
import { useSaldoLoja } from "../hooks/use-saldo-loja";
import { formatCurrency } from "@/lib/format/currency";
import { i18nConfig } from "@/lib/i18n-config";

const brl = (v: number) =>
  formatCurrency(v);

const VALORES_SUGERIDOS = [50, 100, 200, 500, 1000];

export function SaldoLojaCard({ lojaId }: { lojaId: string }) {
  const {
    saldoQ,
    movsQ,
    recarga,
    setRecarga,
    criando,
    valor,
    setValor,
    gerarPix,
  } = useSaldoLoja(lojaId);
  const [copied, setCopied] = useState(false);

  const saldo = saldoQ.data?.saldo ?? 0;
  const negativo = saldo < 0;

  const copiar = async () => {
    if (!recarga?.qrCode) return;
    await navigator.clipboard.writeText(recarga.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="bg-white border border-border rounded-xl p-6 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-navy text-xs uppercase tracking-wider font-bold">
          <Wallet className="h-3.5 w-3.5" /> Saldo da loja
        </div>
        {negativo && (
          <span className="inline-flex items-center rounded-full bg-destructive/15 text-destructive border border-destructive/30 px-2 py-0.5 text-[10px] font-bold uppercase">
            Saldo negativo
          </span>
        )}
      </div>

      <div className={`text-4xl font-bold ${negativo ? "text-destructive" : "text-navy"}`}>
        {saldoQ.isLoading ? "..." : brl(saldo)}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        A cada entrega concluída, o valor da taxa é debitado deste saldo e creditado
        ao entregador. Mantenha um saldo positivo para evitar bloqueios.
      </p>

      {!recarga && (
        <div className="mt-5 space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              Valor da recarga
            </label>
            <div className="flex gap-2">
              <span className="inline-flex items-center px-3 rounded-md border border-border bg-background text-sm">
                {i18nConfig.currencySymbol}
              </span>
              <input
                type="number"
                min={5}
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
                placeholder="0,00"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {VALORES_SUGERIDOS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setValor(String(v))}
                  className="px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs font-bold"
                >
                  {i18nConfig.currencySymbol} {v}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={gerarPix}
            disabled={criando}
            className="w-full py-3 rounded-md font-bold uppercase tracking-wider text-sm bg-gradient-red shadow-red text-primary-foreground inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {criando && <Loader2 className="h-4 w-4 animate-spin" />}
            Recarregar via PIX
          </button>
        </div>
      )}

      {recarga && (
        <div className="mt-5 space-y-3">
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Valor
            </div>
            <div className="text-2xl font-bold">{brl(recarga.valor)}</div>
          </div>
          {recarga.status === "approved" ? (
            <div className="rounded-md border border-green-500/40 bg-green-500/10 p-4 text-center">
              <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="font-bold text-green-700">Recarga confirmada!</div>
              <button
                onClick={() => setRecarga(null)}
                className="mt-3 px-4 py-1.5 rounded-md bg-foreground text-background text-xs font-bold uppercase"
              >
                Fechar
              </button>
            </div>
          ) : (
            <>
              {recarga.qrCodeBase64 && (
                <div className="bg-white p-3 rounded-md flex justify-center">
                  <img
                    src={`data:image/png;base64,${recarga.qrCodeBase64}`}
                    alt="QR PIX"
                    className="max-w-[240px]"
                  />
                </div>
              )}
              {recarga.qrCode && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Pix copia e cola
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={recarga.qrCode}
                      className="flex-1 px-3 py-2 rounded-md bg-background border border-border text-xs font-mono truncate"
                    />
                    <button
                      onClick={copiar}
                      className="px-3 py-2 rounded-md bg-foreground text-background font-bold text-xs uppercase inline-flex items-center gap-1"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "OK" : "Copiar"}
                    </button>
                  </div>
                </div>
              )}
              <div className="text-xs text-muted-foreground text-center inline-flex items-center justify-center gap-2 w-full">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Aguardando pagamento...
              </div>
              <button
                onClick={() => setRecarga(null)}
                className="w-full py-2 rounded-md border border-border text-muted-foreground text-xs uppercase hover:bg-muted"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      )}

      {!!movsQ.data?.length && (
        <div className="mt-6">
          <div className="text-xs font-bold uppercase tracking-wider text-navy mb-4 flex items-center gap-2">
            <History className="h-4 w-4" /> Últimos movimentos
          </div>
          <div className="bg-background border border-border rounded-lg overflow-hidden">
            <ul className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {movsQ.data!.map((m) => {
                const positivo = m.valor > 0;
                return (
                  <li key={m.id} className="p-4 flex items-center justify-between text-sm hover:bg-muted/30 transition-colors">
                    <div className="min-w-0 pr-3">
                      <div className="font-semibold text-navy truncate">{m.descricao ?? m.tipo}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        {new Date(m.created_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-base ${positivo ? "text-green-600" : "text-destructive"}`}>
                        {positivo ? "+" : ""}
                        {brl(m.valor)}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Saldo: {brl(m.saldo_apos)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
