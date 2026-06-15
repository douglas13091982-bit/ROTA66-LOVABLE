import { useState } from "react";
import { Store } from "lucide-react";
import { Field } from "./Field";
import { formatCnpj } from "../logic/cnpj";
import { useCriarLoja } from "../hooks/use-criar-loja";

export function CriarLojaForm() {
  const { criar, saving } = useCriarLoja();
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    criar({ nome, cnpj, telefone, cidade });
  };

  return (
    <div className="max-w-xl mx-auto pp-card pp-hairline-top rounded-2xl p-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="pp-disc pp-disc-accent h-12 w-12">
          <Store className="h-6 w-6" />
        </div>
        <div>
          <h2 className="pp-title-page text-2xl text-white">Criar sua loja</h2>
          <p className="text-sm text-white/55 mt-0.5">
            Pegue a estrada da ROTA 66 em poucos passos.
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
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
        <button
          disabled={saving}
          className="pp-cta w-full py-3.5 text-sm disabled:opacity-50"
        >
          {saving ? "Criando..." : "Criar loja"}
        </button>
      </form>
    </div>
  );
}
