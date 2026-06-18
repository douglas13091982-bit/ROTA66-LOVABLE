import { Settings, Store } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLojaPlano } from "../hooks/use-loja-plano";
import { EntregadoresDaLoja } from "./EntregadoresDaLoja";
import { StatusSection } from "./StatusSection";
import { CatalogoSection } from "./CatalogoSection";
import { PlanoMensalSection } from "./PlanoMensalSection";
import { MensalidadeSection } from "./MensalidadeSection";
import { PlanoSelectSection } from "./PlanoSelectSection";

interface Props {
  loja: any;
  onSetStatus: (id: string, status: "aprovado" | "bloqueado") => void;
  onRemove: (id: string, nome: string) => void;
  onToggleCatalogo: (id: string, atual: boolean) => void;
  onChanged: () => void;
}

export function LojaManageDialog({
  loja: l,
  onSetStatus,
  onRemove,
  onToggleCatalogo,
  onChanged,
}: Props) {
  const {
    mensValor,
    setMensValor,
    diaVenc,
    setDiaVenc,
    savingM,
    salvarMensalidade,
    planoAtivo,
    savingPlano,
    togglePlano,
  } = useLojaPlano(l, onChanged);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition">
          <Settings className="h-3.5 w-3.5" /> Gerenciar
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-gradient-red shadow-red flex items-center justify-center shrink-0">
              <Store className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="truncate">{l.nome}</div>
              <div className="text-xs font-normal text-muted-foreground truncate">
                /{l.slug} • {l.cidade ?? "—"} • {l.telefone ?? "sem telefone"}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <StatusSection
            status={l.status}
            onAprovar={() => onSetStatus(l.id, "aprovado")}
            onBloquear={() => onSetStatus(l.id, "bloqueado")}
            onRemover={() => onRemove(l.id, l.nome)}
          />

          <CatalogoSection
            ativo={!!l.catalogo_ativo}
            slug={l.slug}
            catalogoSlug={l.catalogo_slug}
            onToggle={() => onToggleCatalogo(l.id, !!l.catalogo_ativo)}
          />

          <PlanoSelectSection
            lojaId={l.id}
            planoIdAtual={l.plano_id ?? null}
            onChanged={onChanged}
          />

          <PlanoMensalSection
            lojaId={l.id}
            planoAtivo={planoAtivo}
            savingPlano={savingPlano}
            onToggle={togglePlano}
          />

          <MensalidadeSection
            valor={mensValor}
            diaVenc={diaVenc}
            saving={savingM}
            onValorChange={setMensValor}
            onDiaVencChange={setDiaVenc}
            onSalvar={salvarMensalidade}
          />

          <section className="border-t border-border pt-4">
            <EntregadoresDaLoja lojaId={l.id} alwaysOpen />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
