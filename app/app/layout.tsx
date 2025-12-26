import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardSidebar from './DashboardSidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();

  // Redirect to login if not authenticated
  // (This is a backup - middleware should catch this first)
  if (error || !user) {
    redirect('/login');
  }

  // Extract user display info
  const userInfo = {
    email: user.email || '',
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      <DashboardSidebar user={userInfo} />
      
      {/* Main Content */}
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  );
}
