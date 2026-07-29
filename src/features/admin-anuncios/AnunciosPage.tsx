import { Megaphone } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { useAnuncios } from "./hooks/use-anuncios";
import { NovoAnuncioForm } from "./components/NovoAnuncioForm";
import { AnunciosList } from "./components/AnunciosList";

export function AnunciosPage() {
  const {
    anuncios,
    isLoading,
    titulo,
    setTitulo,
    linkUrl,
    setLinkUrl,
    imageDataUrl,
    diasValidade,
    setDiasValidade,
    saving,
    handleFile,
    handleCreate,
    toggleAtivo,
    atualizarPrazo,
    handleDelete,
  } = useAnuncios();

  return (
    <AdminShell title="Anúncios">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl tracking-wide flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Avisos para entregadores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Banners exibidos na parte inferior da página de pedidos disponíveis.
          </p>
        </div>

        <NovoAnuncioForm
          titulo={titulo}
          linkUrl={linkUrl}
          imageDataUrl={imageDataUrl}
          diasValidade={diasValidade}
          onDiasChange={setDiasValidade}
          saving={saving}
          onTituloChange={setTitulo}
          onLinkChange={setLinkUrl}
          onFile={handleFile}
          onCreate={handleCreate}
        />

        <AnunciosList
          anuncios={anuncios}
          isLoading={isLoading}
          onToggle={toggleAtivo}
          onPrazo={atualizarPrazo}
          onDelete={handleDelete}
        />
      </div>
    </AdminShell>
  );
}
