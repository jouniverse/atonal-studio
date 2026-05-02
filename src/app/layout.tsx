import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { AppSession } from '@/components/layout/AppSession';
import { SideNav } from '@/components/layout/SideNav';
import { TopAppBar } from '@/components/layout/TopAppBar';
import { DocsOverlay } from '@/components/layout/DocsOverlay';
import { SysOverlay } from '@/components/layout/SysOverlay';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });

export const metadata: Metadata = {
  title: 'ATONAL_STUDIO',
  description: 'Algorithmic atonal music composition',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased min-h-screen overflow-hidden`}>
        <ThemeProvider>
          <AppSession>
            <div className="flex flex-col h-svh">
              <TopAppBar />
              <div className="flex flex-1 overflow-hidden">
                <SideNav />
                <main className="flex-1 ml-20 touch:ml-0 touch:pb-16 overflow-auto touch:overflow-hidden bg-[var(--surface)]">
                  {children}
                </main>
              </div>
            </div>
            <DocsOverlay />
            <SysOverlay />
          </AppSession>
        </ThemeProvider>
      </body>
    </html>
  );
}
