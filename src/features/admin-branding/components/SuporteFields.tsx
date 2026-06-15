import { TextField } from "./TextField";

type Props = {
  whatsapp: string;
  horario: string;
  onWhatsappChange: (v: string) => void;
  onHorarioChange: (v: string) => void;
};

export function SuporteFields({
  whatsapp,
  horario,
  onWhatsappChange,
  onHorarioChange,
}: Props) {
  return (
    <div className="pt-4 border-t border-border space-y-4">
      <div>
        <div className="text-sm font-bold">Suporte do Entregador</div>
        <p className="text-xs text-muted-foreground">
          Exibido na Central de Ajuda do app do entregador.
        </p>
      </div>
      <TextField
        label="WhatsApp de suporte"
        value={whatsapp}
        onChange={onWhatsappChange}
        placeholder="Ex: 5547999999999 (com DDI e DDD, somente números)"
        hint="Use o formato internacional sem símbolos. Ex: 5547999999999."
      />
      <TextField
        label="Horário de atendimento"
        value={horario}
        onChange={onHorarioChange}
        placeholder="Ex: Segunda a sábado, 8h às 20h"
        maxLength={120}
      />
    </div>
  );
}
