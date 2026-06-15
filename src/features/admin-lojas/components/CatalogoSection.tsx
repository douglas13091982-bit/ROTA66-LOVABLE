import { Toggle } from "./Toggle";

type Props = {
  ativo: boolean;
  slug: string;
  catalogoSlug: string | null | undefined;
  onToggle: () => void;
};

export function CatalogoSection({ ativo, slug, catalogoSlug, onToggle }: Props) {
  return (
    <section className="border-t border-border pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Catálogo online
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {ativo
              ? `Ativo em /c/${catalogoSlug ?? slug}`
              : "Desativado — loja não aparece no catálogo público"}
          </p>
        </div>
        <Toggle ativo={ativo} onClick={onToggle} />
      </div>
    </section>
  );
}
