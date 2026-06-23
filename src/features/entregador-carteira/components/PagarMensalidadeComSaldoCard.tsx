import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useSaqueEntregador } from "../hooks/use-saque";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Props = {
  mensalidadeValor: number;
  mensalidadePaga: boolean;
};

export function PagarMensalidadeComSaldoCard({ mensalidadeValor, mensalidadePaga }: Props) {
  const qc = useQueryClient();
  const { resumoQ } = useSaqueEntregador();
  const saldoSaque = resumoQ.data?.saldo ?? 0;
  const [open, setOpen] = useState(false);

  const mut = useMutation({
    mutationFn: async (valor: number) => {
      const { data, error } = await supabase.rpc("entregador_pagar_mensalidade_com_saldo", {
        _valor: valor,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Pagamento feito com o saldo de corridas");
      qc.invalidateQueries({ queryKey: ["entregador-saldo"] });
      qc.invalidateQueries({ queryKey: ["entregador-transacoes"] });
      qc.invalidateQueries({ queryKey: ["entregador-saque-resumo"] });
      setOpen(false);
    },
    onError: (err: any) => toast.error(err?.message ?? "Falha ao transferir saldo"),
  });

  if (mensalidadePaga || mensalidadeValor <= 0) return null;

  const podePagar = saldoSaque >= mensalidadeValor;

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-emerald-500/15 p-2">
          <ArrowRightLeft className="h-4 w-4 text-emerald-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white">
            Pagar mensalidade com saldo de corridas
          </div>
          <div className="text-xs text-white/60 mt-0.5">
            Use {brl(mensalidadeValor)} do seu saldo de corridas ({brl(saldoSaque)} disponível)
            para quitar este mês sem PIX.
          </div>
        </div>
      </div>

      <Button
        className="w-full mt-3"
        variant="outline"
        disabled={!podePagar || mut.isPending || resumoQ.isLoading}
        onClick={() => setOpen(true)}
      >
        {!podePagar ? "Saldo de corridas insuficiente" : "Pagar com saldo"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pagamento</DialogTitle>
            <DialogDescription>
              Vamos debitar <strong>{brl(mensalidadeValor)}</strong> do seu saldo de corridas e
              creditar como pagamento da mensalidade. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-white/[0.04] p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-white/60">Saldo de corridas atual</span>
              <span className="text-white">{brl(saldoSaque)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Valor a transferir</span>
              <span className="text-white">- {brl(mensalidadeValor)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-1 border-t border-white/10">
              <span className="text-white/80">Saldo restante</span>
              <span className="text-emerald-300">{brl(saldoSaque - mensalidadeValor)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => mut.mutate(mensalidadeValor)} disabled={mut.isPending}>
              {mut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
