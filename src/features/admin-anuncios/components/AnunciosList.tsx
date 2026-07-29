import { AnuncioCard } from "./AnuncioCard";
import type { AnuncioRow } from "../logic/types";

type Props = {
  anuncios: AnuncioRow[] | undefined;
  isLoading: boolean;
  onToggle: (id: string, ativo: boolean) => void;
  onPrazo: (id: string, dias: number | null) => void;
  onDelete: (id: string) => void;
};

export function AnunciosList({ anuncios, isLoading, onToggle, onPrazo, onDelete }: Props) {
  return (
    <div className="space-y-3">
      <div className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
        Anúncios cadastrados
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : !anuncios || anuncios.length === 0 ? (
        <div className="text-sm text-muted-foreground bg-card border border-border rounded-md p-6 text-center">
          Nenhum anúncio cadastrado ainda.
        </div>
      ) : (
        anuncios.map((a) => (
          <AnuncioCard
            key={a.id}
            anuncio={a}
            onToggle={onToggle}
            onPrazo={onPrazo}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  );
}
