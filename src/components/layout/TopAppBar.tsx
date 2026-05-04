'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { useUIStore } from '@/state/useUIStore';

const NAV_LINKS = [
  { href: '/composer', label: 'Composer' },
  { href: '/random', label: 'Random' },
  { href: '/interval-vector', label: 'Intervals' },
  { href: '/serialism', label: 'Rows' },
];

export function TopAppBar() {
  const pathname = usePathname();
  const setDocsOpen = useUIStore((s) => s.setDocsOpen);
  const setSysOpen = useUIStore((s) => s.setSysOpen);

  return (
    <header className="h-12 border-b border-[var(--outline-variant)] bg-[var(--surface-dim)] flex justify-between items-center px-6 shrink-0 z-50">
      <div className="font-[family-name:var(--font-inter)] font-black tracking-tighter text-xl text-[var(--on-surface)]">
        ATONAL_STUDIO
      </div>
      <nav className="hidden mouse:flex items-center gap-6 h-full">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`h-full flex items-center font-[family-name:var(--font-space-grotesk)] text-[11px] tracking-[0.1em] uppercase px-2 transition-colors active:translate-y-[1px] ${
                isActive
                  ? 'text-[var(--on-surface)] border-b-2 border-[var(--on-surface)] pb-1'
                  : 'text-[var(--outline)] hover:text-[var(--on-surface-variant)] hover:bg-[var(--surface-variant)]'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-3">
        {/* Docs + System — touch only, icon only, placed next to theme toggle */}
        <button
          type="button"
          onClick={() => setDocsOpen(true)}
          className="hidden touch:flex items-center justify-center w-9 h-9 text-[var(--outline)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-variant)] rounded-sm transition-all duration-75"
          title="Documentation"
        >
          <span className="material-symbols-outlined text-[20px]">menu_book</span>
        </button>
        <button
          type="button"
          onClick={() => setSysOpen(true)}
          className="hidden touch:flex items-center justify-center w-9 h-9 text-[var(--outline)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-variant)] rounded-sm transition-all duration-75"
          title="System"
        >
          <span className="material-symbols-outlined text-[20px]">memory</span>
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
