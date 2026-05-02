interface MonoChipProps {
  label?: string;
  value: string;
  icon?: string;
  className?: string;
}

export function MonoChip({ label, value, icon, className = '' }: MonoChipProps) {
  return (
    <div className={`flex flex-col gap-[2px] ${className}`}>
      {label && (
        <span className="font-[family-name:var(--font-inter)] text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--outline)]">
          {label}
        </span>
      )}
      <div className="flex items-center gap-2 bg-[var(--surface-container-high)] px-3 py-1.5 rounded border border-[var(--outline-variant)]/30 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]">
        {icon && (
          <span className="material-symbols-outlined text-[14px] text-[var(--outline)]">{icon}</span>
        )}
        <span className="font-[family-name:var(--font-space-grotesk)] text-[13px] tracking-[0.05em] text-[var(--on-surface)]">
          {value}
        </span>
      </div>
    </div>
  );
}
