import * as React from "react";

import { cn } from "@/lib/utils";
import { sanitizeText } from "@/lib/sanitize";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, onChange, ...props }, ref) => {
    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (onChange) {
          const original = e.target.value;
          // Defesa em profundidade contra XSS: remove tags, handlers inline,
          // protocolos perigosos e caracteres de controle invisíveis.
          const clean = sanitizeText(original, 20000);
          if (clean !== original) {
            e.target.value = clean;
          }
        }
        onChange?.(e);
      },
      [onChange],
    );

    return (
      <textarea
        className={cn(
          "flex min-h-[88px] w-full rounded-lg border border-border/60 bg-background/50 backdrop-blur-sm px-4 py-3 text-base shadow-soft transition-all duration-300 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] placeholder:text-muted-foreground/60 hover:border-border focus-visible:outline-none focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y",
          className,
        )}
        ref={ref}
        {...props}
        onChange={handleChange}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
