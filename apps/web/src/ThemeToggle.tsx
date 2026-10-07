import type { ThemeMode } from "./useTheme.js";

type Props = {
  theme: ThemeMode;
  onChange: (theme: ThemeMode) => void;
};

const OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function ThemeToggle({ theme, onChange }: Props) {
  return (
    <div className="theme-toggle" role="group" aria-label="Theme">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`theme-toggle-option${theme === option.value ? " active" : ""}`}
          aria-pressed={theme === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
