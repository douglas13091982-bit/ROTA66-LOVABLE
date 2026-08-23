import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowDown,
  ChevronRight,
  WalletCards,
} from "lucide-react";
import { PixIcon } from "@/components/icons/PixIcon";
import { DIAS_SEMANA, useSaqueEntregador, type SaqueRow } from "../hooks/use-saque";
import { formatCurrency } from "@/lib/format";

function brl(v: number) {
  return formatCurrency(v);
}

function StatusBadge({ status }: { status: SaqueRow["status"] }) {
  const map = {
    solicitado: { label: "Solicitado", icon: Clock, cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
    aprovado: { label: "Aprovado", icon: CheckCircle2, cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
    pago: { label: "Pago", icon: CheckCircle2, cls: "bg-green-500/15 text-green-300 border-green-500/30" },
    rejeitado: { label: "Rejeitado", icon: XCircle, cls: "bg-red-500/15 text-red-300 border-red-500/30" },
    cancelado: { label: "Cancelado", icon: XCircle, cls: "bg-white/10 text-white/60 border-white/20" },
  }[status];
  const Icon = map.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${map.cls}`}>
      <Icon className="h-3 w-3" />
      {map.label}
    </Badge>
  );
}

export function SaqueCard() {
  const { resumoQ, saquesQ, perfilQ, solicitarM } = useSaqueEntregador();
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState("");
  const [pix, setPix] = useState("");
  const [verTodos, setVerTodos] = useState(false);

  const resumo = resumoQ.data;
  const saldo = resumo?.saldo ?? 0;
  const minimo = resumo?.valor_minimo ?? 0;
  const diaPermitido = resumo?.dia_semana_permitido ?? 5;
  const modo = resumo?.modo ?? "dia_semana";
  const podeSacar = !!resumo?.pode_sacar_hoje;
  const temPendente = !!resumo?.tem_saque_pendente;

  useEffect(() => {
    if (open) {
      setValor(String(saldo.toFixed(2)));
      setPix(perfilQ.data?.pix_chave ?? "");
    }
  }, [open, saldo, perfilQ.data?.pix_chave]);

  const valorNum = Number(valor.replace(",", "."));
  const valorValido = Number.isFinite(valorNum) && valorNum >= minimo && valorNum <= saldo;
  const pixValido = pix.trim().length >= 5;
  const canSubmit = podeSacar && !temPendente && valorValido && pixValido && !solicitarM.isPending;

  async function confirmar() {
    if (!canSubmit) return;
    await solicitarM.mutateAsync({ valor: valorNum, pix_chave: pix.trim() });
    setOpen(false);
  }

  const lista = saquesQ.data ?? [];
  const visiveis = verTodos ? lista : lista.slice(0, 3);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 flex items-start gap-3">
            <WalletCards className="h-6 w-6 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white leading-tight">Saque das corridas</h3>
              <p className="text-[10px] sm:text-xs text-white/50">Retire seus ganhos quando quiser</p>
            </div>

          </div>
          <div className="shrink-0 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-3 py-2 flex items-center gap-2">
            <div className="leading-tight">
              <div className="text-[10px] text-emerald-300/70">
                {modo === "valor" ? "A partir de" : "Liberado"}
              </div>
              <div className="text-sm font-bold text-emerald-300">
                {modo === "valor" ? brl(minimo) : DIAS_SEMANA[diaPermitido]}
              </div>
            </div>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-3">
            <div className="text-[10px] text-white/50 truncate">Saldo disponível</div>
            <div className="text-base font-bold text-emerald-300 truncate">{brl(saldo)}</div>
            <Wallet className="h-4 w-4 text-white/30 mt-2" />
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-3">
            <div className="text-[10px] text-white/50 truncate">Total recebido</div>
            <div className="text-base font-bold text-white truncate">{brl(resumo?.total_recebido ?? 0)}</div>
            <ArrowDownCircle className="h-4 w-4 text-white/30 mt-2" />
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.04] p-3">
            <div className="text-[10px] text-white/50 truncate">Total sacado</div>
            <div className="text-base font-bold text-white truncate">{brl(resumo?.total_sacado ?? 0)}</div>
            <ArrowUpCircle className="h-4 w-4 text-white/30 mt-2" />
          </div>
        </div>

        <div className="relative rounded-xl border border-white/10 bg-white/[0.02] p-3 pr-12 text-xs text-white/70 space-y-1.5">
          <div className="flex gap-2">
            <span className="text-emerald-400">•</span>
            <span>Valor mínimo de saque: <span className="text-white font-medium">{brl(minimo)}</span></span>
          </div>
          <div className="flex gap-2">
            <span className="text-emerald-400">•</span>
            {modo === "dia_semana" ? (
              <span>Saques liberados apenas às <span className="text-white font-medium">{DIAS_SEMANA[diaPermitido]}s</span></span>
            ) : (
              <span>Saque liberado <span className="text-white font-medium">a qualquer dia</span> quando o saldo atinge o mínimo</span>
            )}
          </div>
          <div className="flex gap-2">
            <span className="text-emerald-400">•</span>
            <span>Pagamento via PIX após aprovação</span>
          </div>
          <PixIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 text-emerald-400/80" />
        </div>

        {temPendente && (
          <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Você já tem um saque em andamento. Aguarde o processamento antes de solicitar outro.</span>
          </div>
        )}

        <Button
          className="w-full h-14 rounded-xl text-base font-bold gap-2 bg-gradient-red shadow-red text-primary-foreground"
          disabled={!podeSacar || temPendente || resumoQ.isLoading}
          onClick={() => setOpen(true)}
        >
          <WalletCards className="h-5 w-5" />
          {!podeSacar && !temPendente
            ? saldo < minimo
              ? `Saldo abaixo de ${brl(minimo)}`
              : modo === "valor"
                ? "Solicitar saque"
                : `Disponível às ${DIAS_SEMANA[diaPermitido]}s`
            : "Solicitar saque"}
        </Button>
      </div>

      {/* Histórico de saques */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold uppercase tracking-wider text-white">Últimos saques</h4>
          {lista.length > 3 && (
            <button
              type="button"
              onClick={() => setVerTodos((v) => !v)}
              className="flex items-center gap-1 text-xs font-semibold text-primary"
            >
              {verTodos ? "Ver menos" : "Ver todos"}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
        {saquesQ.isLoading ? (
          <div className="text-sm text-white/40">Carregando...</div>
        ) : lista.length === 0 ? (
          <div className="text-sm text-white/40">Nenhum saque solicitado ainda.</div>
        ) : (
          <ul className="space-y-2">
            {visiveis.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] p-3"
              >
                <div className="h-10 w-10 shrink-0 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <ArrowDown className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-white truncate">{brl(Number(s.valor))}</div>
                  <div className="text-xs text-white/45 truncate">
                    {new Date(s.solicitado_em).toLocaleDateString("pt-BR")} · {s.pix_chave}
                  </div>
                  {s.motivo_rejeicao && (
                    <div className="text-xs text-red-300 mt-1">Motivo: {s.motivo_rejeicao}</div>
                  )}
                </div>
                <StatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        )}
      </div>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar solicitação de saque</DialogTitle>
            <DialogDescription>
              O valor será enviado via PIX após análise. Confirme os dados abaixo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
              />
              <div className="mt-1 text-xs text-white/50">
                Saldo: {brl(saldo)} · Mínimo: {brl(minimo)}
              </div>
              {!valorValido && valor !== "" && (
                <div className="mt-1 text-xs text-red-300">
                  Informe um valor entre {brl(minimo)} e {brl(saldo)}.
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="pix">Chave PIX</Label>
              <Input
                id="pix"
                value={pix}
                onChange={(e) => setPix(e.target.value)}
                placeholder="CPF, e-mail, telefone ou aleatória"
              />
              {!pixValido && pix !== "" && (
                <div className="mt-1 text-xs text-red-300">Chave PIX inválida.</div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={!canSubmit}>
              {solicitarM.isPending ? "Enviando..." : "Confirmar saque"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
