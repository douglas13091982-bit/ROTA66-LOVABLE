import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useBranding } from "@/hooks/use-branding";
import roadBg from "@/assets/splash-road.webp";
import roadBgDesktop from "@/assets/estrada-desktop.png.asset.json";

export function AuthCard({ title, subtitle, children, footer }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { logoUrl, nomeSistema } = useBranding();
  return (
    <div className="min-h-screen bg-[#0a1428] flex flex-col relative overflow-hidden">
      {/* Foto da estrada — mobile (retrato) */}
      <img
        src={roadBg}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[center_bottom] select-none block landscape:hidden sm:hidden"
      />
      {/* Foto da estrada — desktop / telas largas */}
      <img
        src={roadBgDesktop.url}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center select-none hidden landscape:block sm:block"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0a1428]/90 via-[#0a1428]/55 to-transparent" />
      {/* Véu inferior para reforçar leitura do conteúdo */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0a1428]/85 via-[#0a1428]/35 to-transparent" />

      {/* Ambient background removido — imagem real substitui */}

      <div className="flex-1 flex items-center justify-center px-6 py-16 relative">
        <div className="w-full max-w-md reveal">
          <Link to="/" className="flex flex-col items-center mb-10 group">
            <img
              src={logoUrl}
              alt={nomeSistema}
              width={96}
              height={96}
              className="h-24 w-auto drop-shadow-[0_12px_32px_oklch(0.55_0.21_27_/_0.6)] group-hover:scale-105 transition-transform duration-500 ease-premium"
            />
          </Link>

          <div className="glass auth-card-panel rounded-2xl shadow-elevated p-8 md:p-10">
            <h1 className="font-display text-4xl md:text-5xl tracking-[0.04em] mb-2 leading-tight">{title}</h1>
            {subtitle && <p className="text-muted-foreground text-sm mb-8 leading-relaxed">{subtitle}</p>}
            {children}
          </div>

          {footer && <div className="mt-8 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

import { useState, useCallback } from "react";
import { Eye, EyeOff } from "lucide-react";
import { sanitizeText } from "@/lib/sanitize";

export function AuthInput({ label, onChange, type, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange && type !== "password" && type !== "file") {
        const original = e.target.value;
        const clean = sanitizeText(original, 10000);
        if (clean !== original) e.target.value = clean;
      }
      onChange?.(e);
    },
    [onChange, type],
  );
  return (
    <label className="block mb-5">
      <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-2.5">{label}</span>
      <input
        {...props}
        type={type}
        onChange={handleChange}
        className="w-full bg-background/60 border border-border/60 rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/25 transition-all duration-300 ease-premium"
      />
    </label>
  );
}


export function AuthPasswordInput({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block mb-5">
      <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-2.5">{label}</span>
      <div className="relative">
        <input
          {...props}
          type={show ? "text" : "password"}
          className="w-full bg-background/60 border border-border/60 rounded-lg px-4 py-3 pr-10 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/25 transition-all duration-300 ease-premium"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="w-full bg-gradient-red shadow-elevated text-primary-foreground font-display text-xl tracking-[0.1em] py-3.5 rounded-lg hover:shadow-red hover:-translate-y-0.5 transition-all duration-500 ease-premium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
    >
      {children}
    </button>
  );
}

export function GoogleButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full glass hover:border-primary/60 transition-all duration-300 ease-premium py-3.5 rounded-lg font-bold uppercase tracking-[0.18em] text-xs flex items-center justify-center gap-3 disabled:opacity-50 hover:-translate-y-0.5"
    >
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continuar com Google
    </button>
  );
}
