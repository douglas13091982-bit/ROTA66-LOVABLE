import { useState } from "react";
import { Store } from "lucide-react";
import { Field } from "./Field";
import { PlanoPickerInline } from "./PlanoPickerInline";
import { formatCnpj } from "../logic/cnpj";
import { useCriarLoja } from "../hooks/use-criar-loja";

export function CriarLojaForm() {
  const { criar, saving } = useCriarLoja();
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [planoId, setPlanoId] = useState<string | null>(null);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planoId) return;
    criar({ nome, cnpj, telefone, cidade, plano_id: planoId });
  };

  return (
    <div className="max-w-2xl mx-auto pp-card pp-hairline-top rounded-2xl p-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="pp-disc pp-disc-accent h-12 w-12">
          <Store className="h-6 w-6" />
        </div>
        <div>
          <h2 className="pp-title-page text-2xl text-white">
            {step === 1 ? "Criar sua loja" : "Escolha seu plano"}
          </h2>
          <p className="text-sm text-white/55 mt-0.5">
            {step === 1
              ? "Passo 1 de 2 — Dados da loja."
              : "Passo 2 de 2 — Selecione o plano que melhor se encaixa."}
          </p>
        </div>
      </div>

      {step === 1 ? (
        <form onSubmit={handleNext} className="space-y-4">
          <Field label="Nome da loja" value={nome} onChange={setNome} required />
          <Field
            label="CNPJ"
            value={cnpj}
            onChange={(v) => setCnpj(formatCnpj(v))}
            required
            placeholder="00.000.000/0000-00"
            inputMode="numeric"
            maxLength={18}
          />
          <Field label="Telefone" value={telefone} onChange={setTelefone} required />
          <Field label="Cidade" value={cidade} onChange={setCidade} required />
          <button className="pp-cta w-full py-3.5 text-sm">Continuar</button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <PlanoPickerInline selectedId={planoId} onSelect={setPlanoId} />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-3.5 text-sm rounded-lg border border-white/15 text-white/80 hover:bg-white/5"
            >
              Voltar
            </button>
            <button
              disabled={saving || !planoId}
              className="pp-cta flex-1 py-3.5 text-sm disabled:opacity-50"
            >
              {saving ? "Criando..." : "Criar loja"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
