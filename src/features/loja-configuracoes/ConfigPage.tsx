import { EnderecosColetaManager } from "@/components/EnderecosColetaManager";
import { LojaShell } from "@/components/LojaShell";
import { MercadoPagoConfig } from "@/components/loja/MercadoPagoConfig";
import { useMinhaLoja } from "@/hooks/use-loja";
import { CatalogoLayoutPicker } from "./components/CatalogoLayoutPicker";
import { CategoriaSelect } from "./components/CategoriaSelect";
import { EnderecoMatriz } from "./components/EnderecoMatriz";
import { Field } from "./components/Field";
import { HorarioFuncionamentoEditor } from "./components/HorarioFuncionamentoEditor";
import { LogoUploader } from "./components/LogoUploader";
import { UrlPublica } from "./components/UrlPublica";
import { useConfigLoja } from "./hooks/use-config-loja";

export function ConfigPage() {
  const { data: loja } = useMinhaLoja();
  const {
    form,
    setForm,
    horario,
    setHorario,
    logoUrl,
    setLogoUrl,
    coords,
    setCoords,
    saving,
    handleLogoFile,
    handleSave,
  } = useConfigLoja(loja);

  if (!loja) {
    return (
      <LojaShell title="Configurações">
        <p className="text-muted-foreground">Crie sua loja primeiro no Dashboard.</p>
      </LojaShell>
    );
  }

  const slug = (loja as any).catalogo_slug ?? loja.slug;

  return (
    <LojaShell title="Configurações">
      <form
        onSubmit={handleSave}
        className="max-w-2xl bg-card border border-border rounded-lg p-8 shadow-card space-y-5"
      >
        <Field
          label="Nome da loja"
          value={form.nome}
          onChange={(v) => setForm({ ...form, nome: v })}
        />
        <Field
          label="Telefone"
          value={form.telefone}
          onChange={(v) => setForm({ ...form, telefone: v })}
        />

        <CategoriaSelect
          value={form.categoria}
          onChange={(v) => setForm({ ...form, categoria: v })}
        />

        <LogoUploader
          logoUrl={logoUrl}
          onFile={handleLogoFile}
          onRemove={() => setLogoUrl(null)}
        />

        <EnderecoMatriz
          endereco={form.endereco}
          bairro={form.bairro}
          coordsLat={coords.lat}
          onEnderecoChange={(v) => {
            setForm({ ...form, endereco: v });
            setCoords({ lat: null, lng: null });
          }}
          onSelectPlace={(p) => {
            setForm({ ...form, endereco: p.address });
            setCoords({ lat: p.lat, lng: p.lng });
          }}
          onBairroChange={(v) => setForm({ ...form, bairro: v })}
        />

        <HorarioFuncionamentoEditor horario={horario} setHorario={setHorario} />

        <CatalogoLayoutPicker
          value={form.catalogo_layout}
          onChange={(v) => setForm({ ...form, catalogo_layout: v })}
        />

        <UrlPublica slug={slug} />

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gradient-red shadow-red text-primary-foreground font-display text-xl tracking-wider py-3 rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </form>

      <div className="max-w-2xl mt-6 bg-card border border-border rounded-lg p-8 shadow-card">
        <EnderecosColetaManager lojaId={loja.id} />
      </div>

      <div className="max-w-2xl mt-6 bg-card border border-border rounded-lg p-8 shadow-card">
        <MercadoPagoConfig lojaId={loja.id} />
      </div>
    </LojaShell>
  );
}
