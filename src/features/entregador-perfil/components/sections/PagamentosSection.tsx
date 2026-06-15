import { Field, PrimaryBtn, SectionPanel } from "../ui-atoms";

type Props = {
  pixChave: string;
  setPixChave: (v: string) => void;
  onSalvar: () => void;
  saving: boolean;
  onVerHistorico: () => void;
};

export function PagamentosSection({
  pixChave,
  setPixChave,
  onSalvar,
  saving,
  onVerHistorico,
}: Props) {
  return (
    <SectionPanel>
      <Field
        label="Chave PIX"
        value={pixChave}
        onChange={setPixChave}
        placeholder="CPF, e-mail, telefone ou chave"
      />
      <p className="text-[11px] text-white/45">A loja vê esta chave para te pagar a entrega.</p>
      <PrimaryBtn onClick={onSalvar} disabled={saving}>
        {saving ? "Salvando..." : "Salvar chave"}
      </PrimaryBtn>
      <button
        type="button"
        onClick={onVerHistorico}
        className="w-full text-center text-[12px] font-bold uppercase tracking-[0.18em] text-white/60 hover:text-white py-2"
      >
        Ver histórico de ganhos →
      </button>
    </SectionPanel>
  );
}
