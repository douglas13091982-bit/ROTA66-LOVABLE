import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { isValidCnpj, makeSuffix, onlyDigits, slugify } from "../logic/cnpj";

export function useCriarLoja() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  async function criar(input: {
    nome: string;
    cnpj: string;
    telefone: string;
    cidade: string;
  }) {
    if (!user) return;
    const cnpjDigits = onlyDigits(input.cnpj);
    if (!cnpjDigits) {
      toast.error("CNPJ é obrigatório");
      return;
    }
    if (!isValidCnpj(cnpjDigits)) {
      toast.error("CNPJ inválido");
      return;
    }
    setSaving(true);

    const baseCatalogo = slugify(input.nome);
    let slug = `${baseCatalogo}-${makeSuffix()}`;
    let catalogo_slug = baseCatalogo;
    let inserted = false;
    let lastError: any = null;

    for (let tentativa = 1; tentativa <= 20; tentativa++) {
      const { error } = await supabase.from("lojas").insert({
        owner_id: user.id,
        nome: input.nome,
        slug,
        catalogo_slug,
        cnpj: cnpjDigits,
        telefone: input.telefone,
        cidade: input.cidade,
      });
      if (!error) {
        inserted = true;
        break;
      }
      lastError = error;
      const msg = error.message || "";
      if (/cnpj/i.test(msg) && /(duplicate|unique)/i.test(msg)) break;
      if (/duplicate|unique|violates/i.test(msg)) {
        slug = `${baseCatalogo}-${makeSuffix()}`;
        catalogo_slug = `${baseCatalogo}-${tentativa}`;
      } else {
        break;
      }
    }

    setSaving(false);
    if (!inserted) {
      const msg = /cnpj/i.test(lastError?.message)
        ? lastError.message.includes("duplicate") || lastError.message.includes("unique")
          ? "Este CNPJ já está cadastrado."
          : "CNPJ inválido"
        : lastError?.message || "Erro ao criar loja";
      toast.error("Erro ao criar loja", { description: msg });
    } else {
      toast.success("Loja criada! Recarregando…");
      setTimeout(() => window.location.reload(), 600);
    }
  }

  return { criar, saving };
}
