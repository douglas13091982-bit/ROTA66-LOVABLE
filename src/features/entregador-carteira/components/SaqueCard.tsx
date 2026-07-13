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
import { Wallet, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { DIAS_SEMANA, useSaqueEntregador, type SaqueRow } from "../hooks/use-saque";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-emerald-400" />
          <h3 className="font-semibold text-white">Saque das corridas</h3>
        </div>
        <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 bg-emerald-500/10">
          {modo === "valor" ? `A partir de ${brl(minimo)}` : DIAS_SEMANA[diaPermitido]}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-white/[0.04] p-3">
          <div className="text-xs text-white/50">Saldo disponível</div>
          <div className="text-lg font-semibold text-emerald-300">{brl(saldo)}</div>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-3">
          <div className="text-xs text-white/50">Total recebido</div>
          <div className="text-lg font-semibold text-white">{brl(resumo?.total_recebido ?? 0)}</div>
        </div>
        <div className="rounded-lg bg-white/[0.04] p-3">
          <div className="text-xs text-white/50">Total sacado</div>
          <div className="text-lg font-semibold text-white">{brl(resumo?.total_sacado ?? 0)}</div>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs text-white/70 space-y-1">
        <div>• Valor mínimo de saque: <span className="text-white font-medium">{brl(minimo)}</span></div>
        {modo === "dia_semana" ? (
          <div>• Saques liberados apenas às <span className="text-white font-medium">{DIAS_SEMANA[diaPermitido]}s</span></div>
        ) : (
          <div>• Saque liberado <span className="text-white font-medium">a qualquer dia</span> quando o saldo atinge o mínimo</div>
        )}
        <div>• Pagamento via PIX após aprovação</div>
      </div>

      {temPendente && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Você já tem um saque em andamento. Aguarde o processamento antes de solicitar outro.</span>
        </div>
      )}

      <Button
        className="w-full"
        disabled={!podeSacar || temPendente || resumoQ.isLoading}
        onClick={() => setOpen(true)}
      >
        {!podeSacar && !temPendente
          ? saldo < minimo
            ? `Saldo abaixo de ${brl(minimo)}`
            : modo === "valor"
              ? "Solicitar saque"
              : `Disponível apenas às ${DIAS_SEMANA[diaPermitido]}s`
          : "Solicitar saque"}
      </Button>


      {/* Histórico */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-white/60 uppercase tracking-wide">Últimos saques</div>
        {saquesQ.isLoading ? (
          <div className="text-sm text-white/40">Carregando...</div>
        ) : (saquesQ.data ?? []).length === 0 ? (
          <div className="text-sm text-white/40">Nenhum saque solicitado ainda.</div>
        ) : (
          <ul className="space-y-2">
            {saquesQ.data!.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg bg-white/[0.03] border border-white/5 p-3"
              >
                <div>
                  <div className="font-medium text-white">{brl(Number(s.valor))}</div>
                  <div className="text-xs text-white/50">
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
