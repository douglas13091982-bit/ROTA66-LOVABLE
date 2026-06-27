import { Bike, Camera, Car, Image as ImageIcon, Zap } from "lucide-react";
import type { TipoVeiculo } from "../../logic/types";
import { Field, PrimaryBtn, SectionPanel, SmallBtn } from "../ui-atoms";

type Props = {
  fullName: string;
  setFullName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  tipoVeiculo: TipoVeiculo;
  savingVeiculo: boolean;
  onSalvarVeiculo: (v: TipoVeiculo) => void;
  uploadingAvatar: boolean;
  onTirarFoto: () => void;
  onAbrirGaleria: () => void;
  onSalvar: () => void;
  saving: boolean;
};

export function InfoSection(p: Props) {
  return (
    <SectionPanel>
      <Field label="Nome" value={p.fullName} onChange={p.setFullName} />
      <Field label="Telefone" value={p.phone} onChange={p.setPhone} />
      <Field label="E-mail" value={p.email} disabled />
      <div>
        <label className="block text-[10px] uppercase tracking-[0.22em] text-white/45 font-bold mb-1.5">
          Veículo
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { v: "moto" as const, label: "Moto", Icon: Bike },
              { v: "carro" as const, label: "Carro", Icon: Car },
              { v: "bike_eletrica" as const, label: "Bike elétrica", Icon: Zap },
            ]
          ).map(({ v, label, Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => p.onSalvarVeiculo(v)}
              disabled={p.savingVeiculo}
              className={`flex items-center justify-center gap-2 px-2 py-2.5 rounded-lg border text-[12px] font-bold transition ${
                p.tipoVeiculo === v
                  ? "bg-white/10 border-white/30 text-white"
                  : "bg-black/30 border-white/10 text-white/55 hover:text-white/85"
              } disabled:opacity-50`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-white/45 mt-1.5">
          Bike elétrica recebe pedidos com coleta a até 4 km. Carros podem agrupar mais pedidos por rota.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <SmallBtn onClick={p.onTirarFoto} disabled={p.uploadingAvatar}>
          <Camera className="h-3.5 w-3.5" /> {p.uploadingAvatar ? "Enviando..." : "Tirar foto"}
        </SmallBtn>
        <SmallBtn onClick={p.onAbrirGaleria} disabled={p.uploadingAvatar}>
          <ImageIcon className="h-3.5 w-3.5" /> Da galeria
        </SmallBtn>
      </div>
      <PrimaryBtn onClick={p.onSalvar} disabled={p.saving}>
        {p.saving ? "Salvando..." : "Salvar"}
      </PrimaryBtn>
    </SectionPanel>
  );
}
