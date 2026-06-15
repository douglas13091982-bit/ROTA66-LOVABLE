import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LojaShell } from "@/components/LojaShell";
import { useMinhaLoja } from "@/hooks/use-loja";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { EnderecosColetaManager } from "@/components/EnderecosColetaManager";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { MercadoPagoConfig } from "@/components/loja/MercadoPagoConfig";
import { LOJA_CATEGORIAS, type LojaCategoria } from "@/lib/loja-categorias";
import {
  DIAS_SEMANA,
  HORARIO_PADRAO,
  lojaAbertaAgora,
  type HorarioFuncionamento,
  type DiaKey,
} from "@/lib/horario-funcionamento";


export const Route = createFileRoute("/_authenticated/loja/configuracoes")({
  component: ConfigPage,
});

const LOGO_MAX_BYTES = 500_000;

function ConfigPage() {
  const { data: loja } = useMinhaLoja();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    endereco: "",
    bairro: "",
    ativa: true,
    catalogo_layout: "cards" as "cards" | "lista",
    categoria: "" as LojaCategoria | "",
    usar_horario_automatico: false,
  });
  const [horario, setHorario] = useState<HorarioFuncionamento>(HORARIO_PADRAO);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loja) {
      setForm({
        nome: loja.nome ?? "",
        telefone: loja.telefone ?? "",
        endereco: loja.endereco ?? "",
        bairro: (loja as any).bairro ?? "",
        ativa: loja.ativa,
        catalogo_layout: (loja as any).catalogo_layout ?? "cards",
        categoria: ((loja as any).categoria ?? "") as LojaCategoria | "",
        usar_horario_automatico: !!(loja as any).usar_horario_automatico,
      });
      const h = (loja as any).horario_funcionamento;
      setHorario(h && typeof h === "object" && Object.keys(h).length ? h : HORARIO_PADRAO);
      setLogoUrl((loja as any).logo_url ?? null);
      setCoords({
        lat: (loja as any).endereco_lat ?? null,
        lng: (loja as any).endereco_lng ?? null,
      });
    }
  }, [loja]);

  const handleLogoFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toast.error("Imagem muito grande (máx 500KB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loja) return;
    setSaving(true);
    const { error } = await supabase
      .from("lojas")
      .update({
        nome: form.nome,
        telefone: form.telefone,
        endereco: form.endereco,
        bairro: form.bairro,
        ativa: lojaAbertaAgora(horario),
        endereco_lat: coords.lat,
        endereco_lng: coords.lng,
        logo_url: logoUrl,
        catalogo_layout: form.catalogo_layout,
        categoria: form.categoria || null,
        usar_horario_automatico: true,
        horario_funcionamento: horario,
      } as any)
      .eq("id", loja.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["minha-loja"] });
    }
  };

  if (!loja) {
    return (
      <LojaShell title="Configurações">
        <p className="text-muted-foreground">Crie sua loja primeiro no Dashboard.</p>
      </LojaShell>
    );
  }

  return (
    <LojaShell title="Configurações">
      <form
        onSubmit={handleSave}
        className="max-w-2xl bg-card border border-border rounded-lg p-8 shadow-card space-y-5"
      >
        <Field label="Nome da loja" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} />
        <Field label="Telefone" value={form.telefone} onChange={(v) => setForm({ ...form, telefone: v })} />

        <label className="block">
          <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Categoria de atuação
          </span>
          <select
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value as LojaCategoria | "" })}
            className="w-full bg-background border border-border rounded-md px-4 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Selecione...</option>
            {LOJA_CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>

        <div>
          <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Logo da loja (catálogo)
          </span>
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-xl bg-background border border-border flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] text-muted-foreground text-center px-1">Sem logo</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-muted text-xs font-bold uppercase tracking-wider rounded-md cursor-pointer hover:bg-muted/70">
                  Enviar logo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleLogoFile(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl(null)}
                    className="px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-md border border-border text-muted-foreground hover:text-primary"
                  >
                    Remover
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">PNG, JPG, SVG ou WebP — máx 500KB.</p>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border space-y-4">
          <div>
            <div className="font-display text-lg tracking-wide flex items-center gap-2">
              🏠 Endereço da Matriz
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Este é o endereço de coleta padrão. Outros locais podem ser adicionados na seção abaixo.
            </p>
          </div>
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Endereço
            </span>
            <AddressAutocomplete
              className="w-full bg-background border border-border rounded-md px-4 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              value={form.endereco}
              onChange={(v) => {
                setForm({ ...form, endereco: v });
                setCoords({ lat: null, lng: null });
              }}
              onSelectPlace={(p) => {
                setForm({ ...form, endereco: p.address });
                setCoords({ lat: p.lat, lng: p.lng });
              }}
              placeholder="Rua, número, bairro, cidade"
            />
            {form.endereco && coords.lat == null && (
              <span className="block text-[11px] text-amber-600 mt-1">
                Selecione uma sugestão para salvar as coordenadas (necessário para taxa automática).
              </span>
            )}
          </label>

          <Field
            label="Bairro"
            value={form.bairro}
            onChange={(v) => setForm({ ...form, bairro: v })}
          />
        </div>

        <div className="p-4 bg-background rounded-md border border-border space-y-3">
          <div>
            <div className="font-bold uppercase tracking-wider text-sm">Horário de funcionamento</div>
            <div className="text-xs text-muted-foreground">
              A loja abre e fecha automaticamente nos horários abaixo (horário de Brasília)
            </div>
          </div>

          <div className="space-y-2">
            {DIAS_SEMANA.map((d) => {
              const cfg = horario[d.key as DiaKey] ?? { aberto: false, inicio: "08:00", fim: "18:00" };
              const setCfg = (patch: Partial<typeof cfg>) =>
                setHorario({ ...horario, [d.key]: { ...cfg, ...patch } });
              return (
                <div key={d.key} className="flex items-center gap-2 flex-wrap">
                  <label className="flex items-center gap-2 w-28 shrink-0 text-sm">
                    <input
                      type="checkbox"
                      checked={cfg.aberto}
                      onChange={(e) => setCfg({ aberto: e.target.checked })}
                      className="accent-primary"
                    />
                    <span className="font-bold uppercase tracking-wider text-xs">{d.label}</span>
                  </label>
                  <input
                    type="time"
                    disabled={!cfg.aberto}
                    value={cfg.inicio}
                    onChange={(e) => setCfg({ inicio: e.target.value })}
                    className="bg-card border border-border rounded-md px-2 py-1.5 text-sm disabled:opacity-40"
                  />
                  <span className="text-xs text-muted-foreground">às</span>
                  <input
                    type="time"
                    disabled={!cfg.aberto}
                    value={cfg.fim}
                    onChange={(e) => setCfg({ fim: e.target.value })}
                    className="bg-card border border-border rounded-md px-2 py-1.5 text-sm disabled:opacity-40"
                  />
                </div>
              );
            })}
            <p className="text-[11px] text-muted-foreground">
              {lojaAbertaAgora(horario)
                ? "✓ Neste momento a loja está aberta."
                : "✗ Neste momento a loja está fechada."}
            </p>
          </div>
        </div>



        <label className="block p-4 bg-background rounded-md border border-border">
          <div className="font-bold uppercase tracking-wider text-sm mb-3">Layout do catálogo</div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, catalogo_layout: "cards" })}
              className={`flex-1 px-4 py-3 rounded-md border text-xs font-bold uppercase tracking-wider transition ${form.catalogo_layout === "cards" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/40"}`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, catalogo_layout: "lista" })}
              className={`flex-1 px-4 py-3 rounded-md border text-xs font-bold uppercase tracking-wider transition ${form.catalogo_layout === "lista" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/40"}`}
            >
              Lista
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">Escolha como os produtos aparecem no catálogo público.</p>
        </label>

        <div className="p-4 bg-background rounded-md border border-border">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
            URL pública (catálogo)
          </div>
          <code className="text-primary">/c/{(loja as any).catalogo_slug ?? loja.slug}</code>
        </div>

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

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-border rounded-md px-4 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      />
    </label>
  );
}
