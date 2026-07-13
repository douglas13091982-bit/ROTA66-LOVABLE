import { useState } from "react";
import { toast } from "sonner";
import type { LojaCategoria } from "@/lib/loja-categorias";
import { convertImageToWebp } from "@/lib/image-to-webp";
import type { Role } from "./roles";

export type SignupForm = {
  fullName: string;
  nomeLoja: string;
  phone: string;
  cpf: string;
  cnpj: string;
  categoria: LojaCategoria | "";
  endereco: string;
  cidade: string;
  estado: string;
  email: string;
  password: string;
  tipoVeiculo: "moto" | "carro" | "bike_eletrica";
  cityId: string;
  aceiteContrato: boolean;
  avatarFile: File | null;
  avatarPreview: string | null;
};

export const INITIAL_FORM: SignupForm = {
  fullName: "",
  nomeLoja: "",
  phone: "",
  cpf: "",
  cnpj: "",
  categoria: "",
  endereco: "",
  cidade: "",
  estado: "",
  email: "",
  password: "",
  tipoVeiculo: "moto",
  cityId: "",
  aceiteContrato: false,
  avatarFile: null,
  avatarPreview: null,
};

export function useSignupForm() {
  const [form, setForm] = useState<SignupForm>(INITIAL_FORM);
  const update = <K extends keyof SignupForm>(key: K, value: SignupForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleAvatarChange = async (file: File | null) => {
    if (!file) {
      update("avatarFile", null);
      update("avatarPreview", null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 3MB)");
      return;
    }
    const converted = await convertImageToWebp(file);
    update("avatarFile", converted);
    const reader = new FileReader();
    reader.onload = () => update("avatarPreview", reader.result as string);
    reader.readAsDataURL(converted);
  };

  return { form, update, handleAvatarChange };
}

export type { Role };
