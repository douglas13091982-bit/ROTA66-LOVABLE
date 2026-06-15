import { z } from "zod";
import {
  isValidCep,
  isValidCnpj,
  isValidCpf,
  isValidPhoneBr,
} from "./br-documents";

export const cpfSchema = z
  .string()
  .trim()
  .refine(isValidCpf, { message: "CPF inválido" });

export const cnpjSchema = z
  .string()
  .trim()
  .refine(isValidCnpj, { message: "CNPJ inválido" });

export const cepSchema = z
  .string()
  .trim()
  .refine(isValidCep, { message: "CEP inválido" });

export const phoneBrSchema = z
  .string()
  .trim()
  .refine(isValidPhoneBr, { message: "Telefone inválido" });

export const emailSchema = z
  .string()
  .trim()
  .email({ message: "E-mail inválido" })
  .max(255);

export const passwordSchema = z
  .string()
  .min(8, { message: "Mínimo de 8 caracteres" })
  .max(128, { message: "Máximo de 128 caracteres" });

export const nomeSchema = z
  .string()
  .trim()
  .min(2, { message: "Nome muito curto" })
  .max(120, { message: "Nome muito longo" });

export const enderecoSchema = z.object({
  cep: cepSchema,
  rua: z.string().trim().min(1).max(200),
  numero: z.string().trim().min(1).max(20),
  complemento: z.string().trim().max(120).optional().or(z.literal("")),
  bairro: z.string().trim().min(1).max(120),
  cidade: z.string().trim().min(1).max(120),
  uf: z.string().trim().length(2),
});

export type EnderecoInput = z.infer<typeof enderecoSchema>;
