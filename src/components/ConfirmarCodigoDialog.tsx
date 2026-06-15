import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
  pedidoNumero: number;
  tipo: "coleta" | "entrega";
  onSuccess?: () => void;
}

export function ConfirmarCodigoDialog({ open, onOpenChange, pedidoId, pedidoNumero, tipo, onSuccess }: Props) {
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (value: string) => {
    if (value.length !== 4) return;
    setLoading(true);
    const rpc = tipo === "coleta" ? "confirmar_coleta" : "confirmar_entrega";
    const { error } = await supabase.rpc(rpc, { _pedido_id: pedidoId, _codigo: value });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      setCodigo("");
      return;
    }
    toast.success(tipo === "coleta" ? "Coleta confirmada!" : "Entrega confirmada! 🎉");
    setCodigo("");
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) { onOpenChange(o); if (!o) setCodigo(""); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Pedido #{pedidoNumero}</DialogTitle>
          <DialogDescription>
            Digite o código de 4 dígitos que o entregador está mostrando para confirmar a {tipo}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <InputOTP
            maxLength={4}
            value={codigo}
            onChange={(v) => {
              setCodigo(v);
              if (v.length === 4) submit(v);
            }}
            disabled={loading}
            inputMode="numeric"
            pattern="[0-9]*"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className="h-14 w-12 text-2xl" />
              <InputOTPSlot index={1} className="h-14 w-12 text-2xl" />
              <InputOTPSlot index={2} className="h-14 w-12 text-2xl" />
              <InputOTPSlot index={3} className="h-14 w-12 text-2xl" />
            </InputOTPGroup>
          </InputOTP>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Confirmando...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
