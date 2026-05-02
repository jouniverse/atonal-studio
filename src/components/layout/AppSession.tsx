'use client';

import { KeyboardShortcuts } from './KeyboardShortcuts';
import { ShareHashHydration } from './ShareHashHydration';

export function AppSession({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ShareHashHydration />
      <KeyboardShortcuts />
      {children}
    </>
  );
}
