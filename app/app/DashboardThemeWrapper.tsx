'use client';

import { ThemeProvider } from '@/lib/theme-provider';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering theme-dependent classes until mounted
  const themeClass = mounted ? (resolvedTheme === 'light' ? 'light' : 'dark') : 'dark';

  return (
    <div className={`dashboard-theme ${themeClass}`}>
      {children}
    </div>
  );
}

export function DashboardThemeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      storageKey="dashboard-theme"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      <DashboardContent>{children}</DashboardContent>
    </ThemeProvider>
  );
}
