import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useContratos } from "./hooks/use-contratos";
import { VersoesList } from "./components/VersoesList";
import { ContratoEditor } from "./components/ContratoEditor";

export function ContratosPage() {
  const { data: contratos = [], isLoading, salvar, ativar, criarNovaVersao } =
    useContratos();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => contratos.find((c) => c.id === selectedId) ?? contratos[0] ?? null,
    [contratos, selectedId],
  );

  useEffect(() => {
    if (selected) {
      setTitulo(selected.titulo);
      setConteudo(selected.conteudo);
    }
  }, [selected?.id]);

  const handleSalvar = async () => {
    if (!selected) return;
    setSaving(true);
    await salvar(selected.id, titulo, conteudo);
    setSaving(false);
  };

  const handleAtivar = async () => {
    if (!selected || selected.ativo) return;
    const ok = confirm(
      `Ativar a versão ${selected.versao}? Todas as lojas precisarão aceitar novamente no próximo acesso.`,
    );
    if (!ok) return;
    await ativar(selected.id);
  };

  const handleNovaVersao = async () => {
    const nova = await criarNovaVersao(contratos, selected);
    if (nova) setSelectedId(nova.id);
  };

  return (
    <AdminShell title="Contratos">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        <VersoesList
          contratos={contratos}
          isLoading={isLoading}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          onNovaVersao={handleNovaVersao}
        />

        {!selected ? (
          <div className="pp-card rounded-2xl p-5 text-white/60 text-[13px]">
            Nenhum contrato encontrado.
          </div>
        ) : (
          <ContratoEditor
            selected={selected}
            titulo={titulo}
            conteudo={conteudo}
            preview={preview}
            saving={saving}
            onTituloChange={setTitulo}
            onConteudoChange={setConteudo}
            onTogglePreview={() => setPreview((p) => !p)}
            onSalvar={handleSalvar}
            onAtivar={handleAtivar}
          />
        )}
      </div>
    </AdminShell>
  );
}
