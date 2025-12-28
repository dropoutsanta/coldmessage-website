'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Inbox, 
  Megaphone, 
  Users, 
  Settings,
  Plus,
  LogOut,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navigation = [
  { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { name: 'Inbox', href: '/app/inbox', icon: Inbox, badge: 3 },
  { name: 'Campaigns', href: '/app/campaigns', icon: Megaphone },
  { name: 'Leads', href: '/app/leads', icon: Users },
  { name: 'Settings', href: '/app/settings', icon: Settings },
];

interface UserInfo {
  email: string;
  name: string;
  avatarUrl: string | null;
}

export default function DashboardSidebar({ user }: { user: UserInfo }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="w-64 bg-[var(--dash-bg-secondary)] border-r border-[var(--dash-border)] flex flex-col fixed h-full transition-colors duration-300">
      {/* Logo */}
      <div className="p-6 border-b border-[var(--dash-border)]">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/20 blur-md rounded-full group-hover:bg-cyan-500/30 transition-all" />
            <img 
              src="/coldmessage_logo.png" 
              alt="ColdMessage" 
              className="h-8 w-auto relative z-10"
            />
          </div>
          <span className="font-bold text-[var(--dash-text)] text-lg">ColdMessage</span>
        </Link>
      </div>

      {/* New Campaign Button */}
      <div className="p-4">
        <Link
          href="/app/campaigns/new"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-sky-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-5 h-5" />
          New Campaign
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/app' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                isActive 
                  ? "bg-[var(--dash-card-hover)] text-[var(--dash-text)]" 
                  : "text-[var(--dash-text-muted)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-card-bg)]"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-[var(--dash-accent)]" : "text-[var(--dash-text-subtle)] group-hover:text-[var(--dash-text-muted)]"
              )} />
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <span className="px-2 py-0.5 bg-[var(--dash-accent-muted)] text-[var(--dash-accent)] text-xs font-bold rounded-full">
                  {item.badge}
                </span>
              )}
              {isActive && (
                <ChevronRight className="w-4 h-4 text-[var(--dash-text-subtle)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggle */}
      <div className="px-4 pb-2">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-[var(--dash-text-muted)] hover:text-[var(--dash-text)] hover:bg-[var(--dash-card-bg)] transition-all"
          title={mounted && theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {mounted ? (
            theme === 'dark' ? (
              <>
                <Sun className="w-5 h-5 text-[var(--dash-text-subtle)]" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-5 h-5 text-[var(--dash-text-subtle)]" />
                <span>Dark Mode</span>
              </>
            )
          ) : (
            <>
              <Sun className="w-5 h-5 text-[var(--dash-text-subtle)]" />
              <span>Toggle Theme</span>
            </>
          )}
        </button>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-[var(--dash-border)]">
        <div className="flex items-center gap-3 px-3 py-2">
          {user.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={user.name}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center text-white font-bold text-sm">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--dash-text)] truncate">{user.name}</p>
            <p className="text-xs text-[var(--dash-text-subtle)] truncate">{user.email}</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="p-2 text-[var(--dash-text-subtle)] hover:text-[var(--dash-text-muted)] transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
