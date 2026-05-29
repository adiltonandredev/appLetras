import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentRole } from '@/lib/auth/permissions';
import { ROLE_LABELS } from '@rl/utils';
import { PerfilClient } from '@/components/perfil/PerfilClient';

export const metadata: Metadata = { title: 'Meu Perfil — APPLetras' };

export default async function PerfilPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const role = await getCurrentRole(user.id);

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, email, avatar_url, created_at, last_login_at')
    .eq('id', user.id)
    .single();

  const { data: stats } = await supabase
    .from('songs')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', user.id);

  const { data: repStats } = await supabase
    .from('repertories')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', user.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Meu Perfil</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie suas informações pessoais e senha.</p>
      </div>
      <PerfilClient
        profile={profile ?? { id: user.id, full_name: '', email: user.email ?? '', avatar_url: null, created_at: '', last_login_at: null }}
        role={role}
        roleLabel={ROLE_LABELS[role] ?? role}
        songCount={(stats as any)?.count ?? 0}
        repertoryCount={(repStats as any)?.count ?? 0}
      />
    </div>
  );
}
