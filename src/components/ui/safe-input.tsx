import * as React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  sanitizeText,
  sanitizeName,
  sanitizeDigits,
  sanitizePhone,
  sanitizeDecimal,
  sanitizeEmail,
} from "@/lib/sanitize";

/**
 * Inputs com sanitização embutida. Substituem <Input>/<Textarea> em formulários
 * que recebem entrada do usuário. Todos chamam onChange com o valor já limpo.
 *
 * - <SafeTextInput>     texto livre (remove tags/scripts/controle)
 * - <SafeNameInput>     apenas letras/acentos/espaços
 * - <SafeDigitsInput>   apenas dígitos (CEP, OTP, quantidade)
 * - <SafePhoneInput>    telefone (dígitos + opcional)
 * - <SafeNumberInput>   número decimal
 * - <SafeEmailInput>    email normalizado
 * - <SafeTextarea>      texto livre multilinha
 */

type BaseInputProps = Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> & {
  value?: string;
  onChange?: (value: string) => void;
  maxLength?: number;
};

function makeInput(sanitize: (v: string, max?: number) => string, defaultMax: number, inputProps?: Partial<React.ComponentProps<"input">>) {
  return React.forwardRef<HTMLInputElement, BaseInputProps>(({ value, onChange, maxLength = defaultMax, ...rest }, ref) => (
    <Input
      ref={ref}
      value={value ?? ""}
      maxLength={maxLength}
      {...inputProps}
      {...rest}
      onChange={(e) => onChange?.(sanitize(e.target.value, maxLength))}
    />
  ));
}

export const SafeTextInput = makeInput(sanitizeText, 200);
SafeTextInput.displayName = "SafeTextInput";

export const SafeNameInput = makeInput(sanitizeName, 100, { autoComplete: "name" });
SafeNameInput.displayName = "SafeNameInput";

export const SafeDigitsInput = makeInput(sanitizeDigits, 20, { inputMode: "numeric", pattern: "[0-9]*" });
SafeDigitsInput.displayName = "SafeDigitsInput";

export const SafePhoneInput = makeInput(sanitizePhone, 16, { type: "tel", inputMode: "tel", autoComplete: "tel" });
SafePhoneInput.displayName = "SafePhoneInput";

export const SafeEmailInput = makeInput(sanitizeEmail, 254, { type: "email", inputMode: "email", autoComplete: "email" });
SafeEmailInput.displayName = "SafeEmailInput";

type NumberProps = Omit<BaseInputProps, "maxLength"> & {
  maxIntDigits?: number;
  maxDecimals?: number;
};
export const SafeNumberInput = React.forwardRef<HTMLInputElement, NumberProps>(
  ({ value, onChange, maxIntDigits = 12, maxDecimals = 2, ...rest }, ref) => (
    <Input
      ref={ref}
      value={value ?? ""}
      inputMode="decimal"
      {...rest}
      onChange={(e) => onChange?.(sanitizeDecimal(e.target.value, maxIntDigits, maxDecimals))}
    />
  ),
);
SafeNumberInput.displayName = "SafeNumberInput";

type TextareaProps = Omit<React.ComponentProps<typeof Textarea>, "onChange" | "value"> & {
  value?: string;
  onChange?: (value: string) => void;
  maxLength?: number;
};
export const SafeTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ value, onChange, maxLength = 1000, ...rest }, ref) => (
    <Textarea
      ref={ref}
      value={value ?? ""}
      maxLength={maxLength}
      {...rest}
      onChange={(e) => onChange?.(sanitizeText(e.target.value, maxLength))}
    />
  ),
);
SafeTextarea.displayName = "SafeTextarea";
