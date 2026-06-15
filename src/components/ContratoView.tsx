import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Contrato = {
  id: string;
  titulo: string;
  conteudo: string;
  versao: number;
  atualizado_em: string;
};

export function useContratoAtivo() {
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (supabase as any)
      .rpc("contrato_ativo")
      .then(({ data, error }: { data: Contrato[] | null; error: any }) => {
        if (!alive) return;
        if (error) {
          setError(error.message);
        } else {
          setContrato((data && data[0]) || null);
        }
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { contrato, loading, error };
}

/** Render markdown-ish text (very lightweight, no deps). */
export function ContratoBody({ conteudo }: { conteudo: string }) {
  // Simple block renderer: headings (#, ##, ###), lists (-), paragraphs.
  const blocks = conteudo.split(/\n\n+/);
  return (
    <div className="space-y-3 text-[13px] leading-relaxed text-white/80">
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-[14px] font-bold text-white mt-3">
              {trimmed.slice(4)}
            </h3>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={idx} className="text-[15px] font-bold text-white mt-4">
              {trimmed.slice(3)}
            </h2>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={idx} className="text-[18px] font-extrabold text-white mt-2">
              {trimmed.slice(2)}
            </h1>
          );
        }
        if (trimmed.split("\n").every((l) => l.trim().startsWith("- "))) {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1">
              {trimmed.split("\n").map((l, i) => (
                <li key={i}>{renderInline(l.trim().slice(2))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="whitespace-pre-wrap">
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text: string) {
  // **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="text-white font-semibold">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}
