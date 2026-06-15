import { Check, Copy, Loader2 } from "lucide-react";
import { brl } from "../logic/helpers";
import type { RecargaPixState } from "../logic/types";

type Props = {
  recarga: RecargaPixState;
  copied: boolean;
  onCopiar: () => void;
  onFechar: () => void;
};

export function PixRecargaPanel({ recarga, copied, onCopiar, onFechar }: Props) {
  return (
    <div className="space-y-3 mt-4">
      <div className="text-center">
        <div className="text-xs text-white/50 uppercase tracking-wider">Valor</div>
        <div className="text-2xl font-bold text-white">{brl(recarga.valor)}</div>
      </div>

      {recarga.status === "approved" ? (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 p-4 text-center">
          <Check className="h-8 w-8 text-green-400 mx-auto mb-2" />
          <div className="font-bold text-green-200">Pagamento confirmado!</div>
          <button
            onClick={onFechar}
            className="mt-3 px-4 py-1.5 rounded-md bg-white text-black text-xs font-bold uppercase"
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
                alt="QR Code PIX"
                className="max-w-[240px]"
              />
            </div>
          )}
          {recarga.qrCode && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1">
                Pix copia e cola
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={recarga.qrCode}
                  className="flex-1 px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white text-xs font-mono truncate"
                />
                <button
                  onClick={onCopiar}
                  className="px-3 py-2 rounded-md bg-white text-black font-bold text-xs uppercase inline-flex items-center gap-1"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "OK" : "Copiar"}
                </button>
              </div>
            </div>
          )}
          <div className="text-xs text-white/50 text-center inline-flex items-center justify-center gap-2 w-full">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Aguardando pagamento...
          </div>
          <button
            onClick={onFechar}
            className="w-full py-2 rounded-md border border-white/10 text-white/60 text-xs uppercase hover:bg-white/5"
          >
            Cancelar
          </button>
        </>
      )}
    </div>
  );
}
