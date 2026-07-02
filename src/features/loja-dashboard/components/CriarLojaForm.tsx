import { useState } from "react";
import { Store } from "lucide-react";
import { toast } from "sonner";
import { Field } from "./Field";
import { PlanoPickerInline } from "./PlanoPickerInline";
import { formatCnpj } from "../logic/cnpj";
import { useCriarLoja } from "../hooks/use-criar-loja";
import { useCidades } from "@/hooks/use-cidades";

export function CriarLojaForm() {
  const { criar, saving } = useCriarLoja();
  const { cidades } = useCidades();
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cityId, setCityId] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [planoId, setPlanoId] = useState<string | null>(null);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityId) {
      toast.error("Selecione a cidade");
      return;
    }
    setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planoId) return;
    if (!cityId) {
      toast.error("Selecione a cidade");
      return;
    }
    const cidade = cidades.find((c) => c.id === cityId);
    criar({
      nome,
      cnpj,
      telefone,
      cidade: cidade?.nome ?? "",
      estado: cidade?.uf ?? "",
      city_id: cityId,
      plano_id: planoId,
    });
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
          <div>
            <label className="text-xs uppercase tracking-wider text-white/60 mb-1.5 block">
              Cidade <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/60"
            >
              <option value="">Selecione a cidade…</option>
              {cidades.map((c) => (
                <option key={c.id} value={c.id} className="bg-neutral-900">
                  {c.nome} / {c.uf}
                </option>
              ))}
            </select>
            {cidades.length === 0 && (
              <p className="text-[11px] text-amber-300/80 mt-1">
                Nenhuma cidade disponível. Peça ao administrador para cadastrar a sua.
              </p>
            )}
          </div>
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
