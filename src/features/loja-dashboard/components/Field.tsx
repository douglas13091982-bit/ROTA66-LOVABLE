export function Field({
  label,
  value,
  onChange,
  required,
  placeholder,
  inputMode,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  required?: boolean;
  placeholder?: string;
  inputMode?: "numeric" | "tel" | "text" | "email";
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="pp-eyebrow block mb-1.5">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/15 transition"
      />
    </label>
  );
}
