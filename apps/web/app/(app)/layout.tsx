import { Sidebar } from '@/components/ui/Sidebar';
import { TopBar } from '@/components/ui/TopBar';
import { BottomNav } from '@/components/ui/BottomNav';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getCurrentRole } from '@/lib/auth/permissions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect('/login');

  const role = await getCurrentRole(session.user.id);

  return (
    <div className="min-h-screen flex bg-sacred-bg overflow-x-hidden">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <TopBar user={session.user} role={role} />
        <main className="flex-1 p-4 lg:p-6 overflow-auto pb-20 lg:pb-6">
          {children}
        </main>
      </div>
      <BottomNav role={role} />
    </div>
  );
}
