import { Store } from "lucide-react";
import type { LojaPublica } from "../logic/types";
import { LojaCard } from "./LojaCard";

interface Props {
  lojas: LojaPublica[];
  isLoading: boolean;
  cidade: string;
}

export function LojasList({ lojas, isLoading, cidade }: Props) {
  if (isLoading) {
    return <div className="text-center text-muted-foreground py-16 text-sm">Carregando lojas...</div>;
  }
  if (lojas.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
          <Store className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">Nenhuma loja encontrada em {cidade}.</p>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-3">
      {lojas.map((l) => (
        <li key={l.id}>
          <LojaCard loja={l} />
        </li>
      ))}
    </ul>
  );
}
