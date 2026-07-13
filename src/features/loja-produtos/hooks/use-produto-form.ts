import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { convertImageToWebp } from "@/lib/image-to-webp";
import type { Produto } from "../logic/types";

export function useProdutoForm(
  lojaId: string,
  produto: Produto | undefined,
  onSaved: () => void,
  onClose: () => void,
) {
  const [form, setForm] = useState({
    nome: produto?.nome ?? "",
    descricao: produto?.descricao ?? "",
    preco: produto ? String(produto.preco) : "",
    categoria: produto?.categoria ?? "",
    imagem_url: produto?.imagem_url ?? "",
    ordem: produto?.ordem ?? 0,
  });
  const [preview, setPreview] = useState<string>(produto?.imagem_signed_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${lojaId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("produtos")
      .upload(path, file, { upsert: false });
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const { data: signed } = await supabase.storage
      .from("produtos")
      .createSignedUrl(path, 60 * 60);
    setForm((f) => ({ ...f, imagem_url: path }));
    setPreview(signed?.signedUrl ?? "");
    setUploading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim() || !form.preco) return toast.error("Nome e preço são obrigatórios");
    setSaving(true);
    const payload: any = {
      loja_id: lojaId,
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      preco: Number(form.preco),
      categoria: form.categoria.trim() || null,
      imagem_url: form.imagem_url || null,
      ordem: Number(form.ordem) || 0,
    };
    const { error } = produto
      ? await (supabase as any).from("produtos").update(payload).eq("id", produto.id)
      : await (supabase as any).from("produtos").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(produto ? "Produto atualizado" : "Produto criado");
    onSaved();
    onClose();
  }

  return { form, setForm, preview, uploading, saving, handleUpload, handleSave };
}
