import { LogOut } from "lucide-react";
import { useLogout } from "../logic/use-logout";

interface LogoutButtonProps {
  className?: string;
  variant?: "icon" | "full";
  label?: string;
  loadingLabel?: string;
  redirectTo?: "/login" | "/";
  /** Ações extras antes do signOut (ex.: limpar estado local, marcar offline). */
  onBeforeSignOut?: () => void | Promise<void>;
}

/**
 * Botão de logout reutilizável. Para fluxos com UI customizada, use
 * o hook `useLogout` diretamente.
 */
export function LogoutButton({
  className,
  variant = "icon",
  label = "Sair",
  loadingLabel = "Saindo...",
  redirectTo,
  onBeforeSignOut,
}: LogoutButtonProps) {
  const { signOut, loading } = useLogout({ redirectTo });

  const handleClick = async () => {
    if (onBeforeSignOut) await onBeforeSignOut();
    await signOut();
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-label={label}
        title={label}
        className={className}
      >
        <LogOut className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.8} />
      <span className="flex-1 text-[15px] font-bold">
        {loading ? loadingLabel : label}
      </span>
    </button>
  );
}
