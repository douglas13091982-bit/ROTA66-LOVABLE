import { useMemo, useState } from "react";
import { Wallet, Plus, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAdminSaldosLojas,
  useMovimentosLoja,
  type SaldoLojaRow,
} from "../hooks/use-admin-saldos-lojas";
import { formatCurrency, formatDateTime } from "@/lib/format";

function brl(v: number) {
  return formatCurrency(v);
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return formatDateTime(iso);
}

function StatusRecargaBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: "Aprovada", cls: "bg-green-500/15 text-green-300 border-green-500/30" },
    aprovado: { label: "Aprovada", cls: "bg-green-500/15 text-green-300 border-green-500/30" },
    pending: { label: "Pendente", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
    pendente: { label: "Pendente", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
    rejected: { label: "Rejeitada", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
    rejeitado: { label: "Rejeitada", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
    cancelled: { label: "Cancelada", cls: "bg-white/10 text-white/60 border-white/20" },
    cancelado: { label: "Cancelada", cls: "bg-white/10 text-white/60 border-white/20" },
  };
  const m = map[s] ?? { label: status, cls: "bg-white/10 text-white/60 border-white/20" };
  return <Badge variant="outline" className={m.cls}>{m.label}</Badge>;
}

function MovimentosRow({ loja_id }: { loja_id: string }) {
  const movQ = useMovimentosLoja(loja_id);
  if (movQ.isLoading) return <div className="text-xs text-white/40 p-3">Carregando movimentos...</div>;
  const movs = movQ.data ?? [];
  if (movs.length === 0)
    return <div className="text-xs text-white/40 p-3">Nenhum movimento ainda.</div>;
  return (
    <div className="divide-y divide-white/5">
      {movs.map((m) => (
        <div key={m.id} className="flex items-center justify-between px-3 py-2 text-xs">
          <div className="min-w-0">
            <div className="text-white/80">{m.descricao ?? m.tipo}</div>
            <div className="text-white/40">{fmtDate(m.created_at)} · {m.tipo}</div>
          </div>
          <div className="text-right">
            <div className={Number(m.valor) >= 0 ? "text-emerald-300" : "text-red-300"}>
              {Number(m.valor) >= 0 ? "+" : ""}
              {brl(Number(m.valor))}
            </div>
            <div className="text-white/40">Saldo: {brl(Number(m.saldo_apos))}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SaldosLojasSection() {
  const { saldosQ, recargasQ, recargaManualM } = useAdminSaldosLojas();
  const [busca, setBusca] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [recargaLoja, setRecargaLoja] = useState<SaldoLojaRow | null>(null);
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");

  const lojas = useMemo(() => {
    const arr = saldosQ.data ?? [];
    const q = busca.trim().toLowerCase();
    return q ? arr.filter((l) => l.loja_nome.toLowerCase().includes(q)) : arr;
  }, [saldosQ.data, busca]);

  const totalSaldo = useMemo(
    () => (saldosQ.data ?? []).reduce((sum, l) => sum + Number(l.saldo || 0), 0),
    [saldosQ.data],
  );

  async function confirmarRecarga() {
    if (!recargaLoja) return;
    const v = Number(valor.replace(",", "."));
    if (!Number.isFinite(v) || v === 0) return;
    await recargaManualM.mutateAsync({
      loja_id: recargaLoja.loja_id,
      valor: v,
      descricao: descricao.trim() || undefined,
    });
    setRecargaLoja(null);
    setValor("");
    setDescricao("");
  }

  return (
    <div className="space-y-6">
      {/* Header + métricas */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-semibold">Saldos das lojas</h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              saldosQ.refetch();
              recargasQ.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg bg-background border border-border p-3">
            <div className="text-xs text-muted-foreground">Lojas ativas</div>
            <div className="text-lg font-semibold">{(saldosQ.data ?? []).length}</div>
          </div>
          <div className="rounded-lg bg-background border border-border p-3">
            <div className="text-xs text-muted-foreground">Saldo total</div>
            <div className="text-lg font-semibold text-emerald-400">{brl(totalSaldo)}</div>
          </div>
          <div className="rounded-lg bg-background border border-border p-3">
            <div className="text-xs text-muted-foreground">Saldos negativos</div>
            <div className="text-lg font-semibold text-red-400">
              {(saldosQ.data ?? []).filter((l) => Number(l.saldo) < 0).length}
            </div>
          </div>
        </div>

        <Input
          placeholder="Buscar loja..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="mb-3"
        />

        <div className="rounded-lg border border-border overflow-hidden">
          {saldosQ.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
          ) : lojas.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">Nenhuma loja encontrada.</div>
          ) : (
            <ul className="divide-y divide-border">
              {lojas.map((l) => {
                const aberta = expanded === l.loja_id;
                const negativo = Number(l.saldo) < 0;
                return (
                  <li key={l.loja_id}>
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                      <button
                        className="flex-1 text-left min-w-0"
                        onClick={() => setExpanded(aberta ? null : l.loja_id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{l.loja_nome}</span>
                          {negativo && (
                            <Badge variant="outline" className="bg-red-500/15 text-red-300 border-red-500/30">
                              Negativo
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Atualizado em {fmtDate(l.updated_at)}
                        </div>
                      </button>
                      <div className="text-right">
                        <div
                          className={`text-lg font-semibold ${
                            negativo ? "text-red-400" : "text-emerald-400"
                          }`}
                        >
                          {brl(Number(l.saldo))}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRecargaLoja(l);
                          setValor("");
                          setDescricao("");
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Ajustar
                      </Button>
                      <button
                        onClick={() => setExpanded(aberta ? null : l.loja_id)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Ver movimentos"
                      >
                        {aberta ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                    {aberta && (
                      <div className="bg-background/50 border-t border-border">
                        <MovimentosRow loja_id={l.loja_id} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Recargas Mercado Pago */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-base font-semibold mb-3">Recargas via Mercado Pago</h3>
        <div className="rounded-lg border border-border overflow-hidden">
          {recargasQ.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
          ) : (recargasQ.data ?? []).length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              Nenhuma recarga registrada ainda.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recargasQ.data!.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.loja_nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtDate(r.created_at)}
                      {r.mp_payment_id ? ` · MP #${r.mp_payment_id}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold">{brl(Number(r.valor))}</div>
                      {r.aprovado_em && (
                        <div className="text-[10px] text-emerald-300">
                          Aprovada em {fmtDate(r.aprovado_em)}
                        </div>
                      )}
                    </div>
                    <StatusRecargaBadge status={r.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Diálogo recarga manual */}
      <Dialog open={!!recargaLoja} onOpenChange={(o) => !o && setRecargaLoja(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar saldo · {recargaLoja?.loja_nome}</DialogTitle>
            <DialogDescription>
              Use valor positivo para creditar (ex.: PIX externo recebido) e negativo para debitar
              (estorno/correção).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-background border border-border p-3 text-sm flex justify-between">
              <span className="text-muted-foreground">Saldo atual</span>
              <span className="font-semibold">{brl(Number(recargaLoja?.saldo ?? 0))}</span>
            </div>
            <div>
              <Label htmlFor="valor">Valor (R$) — use sinal negativo para debitar</Label>
              <Input
                id="valor"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="100,00"
              />
            </div>
            <div>
              <Label htmlFor="desc">Descrição (opcional)</Label>
              <Input
                id="desc"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex.: PIX recebido manualmente em 23/06"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRecargaLoja(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarRecarga} disabled={recargaManualM.isPending || !valor}>
              {recargaManualM.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
