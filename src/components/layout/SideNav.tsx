'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/state/useUIStore';

const NAV_ITEMS = [
  { href: '/composer', icon: 'piano', label: 'Composer' },
  { href: '/random', icon: 'shuffle', label: 'Random' },
  { href: '/interval-vector', icon: 'analytics', label: 'Vector' },
  { href: '/serialism', icon: 'grid_on', label: 'Matrix' },
];

export function SideNav() {
  const pathname = usePathname();
  const setDocsOpen = useUIStore((s) => s.setDocsOpen);
  const setSysOpen = useUIStore((s) => s.setSysOpen);

  return (
    <>
      {/* ── Desktop: vertical left sidebar (hidden on touch/iPad) ── */}
      <aside className="fixed left-0 top-12 h-[calc(100vh-48px)] w-20 flex flex-col items-center py-4 z-40 bg-[var(--surface-dim)] border-r border-[var(--outline-variant)] touch:hidden">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center w-full px-2">
          <span className="font-[family-name:var(--font-space-grotesk)] text-[10px] uppercase tracking-tighter text-[var(--on-surface)] opacity-50">
            MUSIC_OPS
          </span>
          <span className="font-[family-name:var(--font-space-grotesk)] text-[8px] text-[var(--outline)] mt-1">
            V.1.0.42
          </span>
        </div>

        {/* Nav Items */}
        <nav className="flex flex-col gap-2 w-full px-2 flex-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center w-full py-3 gap-1 rounded-sm transition-all duration-75 ease-linear ${
                  isActive
                    ? 'bg-[var(--on-surface)] text-[var(--surface)]'
                    : 'text-[var(--outline)] hover:bg-[var(--surface-variant)] hover:text-[var(--on-surface-variant)]'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  {item.icon}
                </span>
                <span className="font-[family-name:var(--font-space-grotesk)] text-[10px] uppercase tracking-tighter">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="flex flex-col gap-2 w-full px-2 border-t border-[var(--outline-variant)] pt-4">
          <button
            type="button"
            onClick={() => setDocsOpen(true)}
            className="flex flex-col items-center justify-center w-full py-2 gap-1 text-[var(--outline)] hover:bg-[var(--surface-variant)] rounded-sm transition-all duration-75"
          >
            <span className="material-symbols-outlined text-[16px]">menu_book</span>
            <span className="font-[family-name:var(--font-space-grotesk)] text-[9px] uppercase tracking-tighter opacity-80">Docs</span>
          </button>
          <button
            type="button"
            onClick={() => setSysOpen(true)}
            className="flex flex-col items-center justify-center w-full py-2 gap-1 text-[var(--outline)] hover:bg-[var(--surface-variant)] rounded-sm transition-all duration-75"
          >
            <span className="material-symbols-outlined text-[16px]">memory</span>
            <span className="font-[family-name:var(--font-space-grotesk)] text-[9px] uppercase tracking-tighter opacity-80">System</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile/iPad: horizontal bottom navigation bar ── */}
      <nav className="mouse:hidden touch:fixed touch:bottom-0 touch:left-0 touch:right-0 touch:h-16 touch:flex touch:flex-row touch:items-stretch touch:z-50 touch:bg-[var(--surface-dim)] touch:border-t touch:border-[var(--outline-variant)]">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 gap-0.5 transition-all duration-75 ${
                isActive
                  ? 'bg-[var(--on-surface)] text-[var(--surface)]'
                  : 'text-[var(--outline)] hover:bg-[var(--surface-variant)] hover:text-[var(--on-surface-variant)]'
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="font-[family-name:var(--font-space-grotesk)] text-[9px] uppercase tracking-tighter">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
