'use client';

import { ThemeProvider } from '@/lib/theme-provider';

export function DashboardThemeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      storageKey="dashboard-theme"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      <div className="dashboard-theme">
        {children}
      </div>
    </ThemeProvider>
  );
}

