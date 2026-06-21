import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Star, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lojaId: string;
  lojaNome?: string;
  pedidoId?: string;
  onSaved?: () => void;
}

export function AvaliacaoDialog({ open, onOpenChange, lojaId, lojaNome, pedidoId, onSaved }: Props) {
  const [nota, setNota] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [comentario, setComentario] = useState<string>("");
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNota(0);
    setHover(0);
    setComentario("");
    let cancelled = false;
    (async () => {
      setCarregando(true);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || cancelled) {
        setCarregando(false);
        return;
      }
      const { data } = await supabase
        .from("loja_avaliacoes")
        .select("nota,comentario")
        .eq("loja_id", lojaId)
        .eq("cliente_user_id", auth.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setNota(Number((data as any).nota) || 0);
        setComentario(((data as any).comentario as string) ?? "");
      }
      setCarregando(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, lojaId]);

  const handleSalvar = async () => {
    if (nota < 1) {
      toast.error("Escolha de 1 a 5 estrelas");
      return;
    }
    setSalvando(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast.error("Faça login para avaliar");
      setSalvando(false);
      return;
    }
    const { error } = await supabase
      .from("loja_avaliacoes")
      .upsert(
        {
          loja_id: lojaId,
          cliente_user_id: auth.user.id,
          pedido_id: pedidoId ?? null,
          nota,
          comentario: comentario.trim() || null,
        },
        { onConflict: "loja_id,cliente_user_id" },
      );
    setSalvando(false);
    if (error) {
      toast.error("Erro ao salvar avaliação");
      return;
    }
    toast.success("Avaliação enviada!");
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="catalogo-clean max-w-sm">
        <DialogHeader>
          <DialogTitle>Avaliar {lojaNome ?? "loja"}</DialogTitle>
        </DialogHeader>

        {carregando ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (hover || nota) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNota(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    className="p-1 transition-transform active:scale-90"
                    aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`h-9 w-9 ${active ? "fill-[var(--rota-gold)] stroke-[var(--rota-gold)]" : "stroke-muted-foreground"}`}
                    />
                  </button>
                );
              })}
            </div>

            <Textarea
              placeholder="Conte como foi sua experiência (opcional)"
              value={comentario}
              onChange={(e) => setComentario(e.target.value.slice(0, 400))}
              rows={3}
            />

            <Button onClick={handleSalvar} disabled={salvando || nota < 1}>
              {salvando ? "Enviando…" : "Enviar avaliação"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
