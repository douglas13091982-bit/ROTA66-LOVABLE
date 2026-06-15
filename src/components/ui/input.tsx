import * as React from "react";

import { cn } from "@/lib/utils";
import { sanitizeText } from "@/lib/sanitize";

// Tipos que NÃO devem ser sanitizados (senha precisa permitir qualquer char;
// file/checkbox/radio/hidden/range/color não trabalham com texto livre).
const SKIP_TYPES = new Set([
  "password",
  "file",
  "checkbox",
  "radio",
  "hidden",
  "range",
  "color",
  "button",
  "submit",
  "reset",
  "image",
]);

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, ...props }, ref) => {
    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (onChange && type !== undefined && !SKIP_TYPES.has(type)) {
          const original = e.target.value;
          // Defesa em profundidade contra XSS: remove tags, handlers inline,
          // protocolos perigosos e caracteres de controle invisíveis.
          const clean = sanitizeText(original, 10000);
          if (clean !== original) {
            e.target.value = clean;
          }
        } else if (onChange && type === undefined) {
          const original = e.target.value;
          const clean = sanitizeText(original, 10000);
          if (clean !== original) {
            e.target.value = clean;
          }
        }
        onChange?.(e);
      },
      [onChange, type],
    );

    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border border-border/60 bg-background/50 backdrop-blur-sm px-4 py-2 text-base shadow-soft transition-all duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/60 hover:border-border focus-visible:outline-none focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
        onChange={handleChange}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
