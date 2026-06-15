type Props = {
  ativo: boolean;
  onClick: () => void;
  disabled?: boolean;
};

export function Toggle({ ativo, onClick, disabled }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition shrink-0 ${
        ativo ? "bg-green-600" : "bg-zinc-600"
      } disabled:opacity-40`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
          ativo ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
