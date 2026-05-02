import type { Metadata } from 'next';
import type { CelebrationType } from '@rl/types';
import { createClient } from '@/lib/supabase/server';
import { getCurrentRole } from '@/lib/auth/permissions';
import { can } from '@rl/utils';
import { Music, BookOpen, ClipboardCheck, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatDate, timeAgo, CELEBRATION_ICONS } from '@rl/utils';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const role = await getCurrentRole(session.user.id);
  const userName = session.user.user_metadata?.full_name?.split(' ')[0] ?? 'usuário';

  // Load stats in parallel
  const [songsResult, repertoriesResult, pendingResult] = await Promise.all([
    supabase.from('songs').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('repertories').select('id', { count: 'exact', head: true })
      .eq('created_by', session.user.id),
    can(role, 'songs:approve')
      ? supabase.from('song_approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      : Promise.resolve({ count: 0, error: null }),
  ]);

  const [recentRepertories, recentSongs] = await Promise.all([
    supabase.from('repertories')
      .select('id, title, celebration, event_date, created_at')
      .eq('created_by', session.user.id)
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase.from('songs')
      .select('id, title, status, created_at, key_note')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const stats = [
    { label: 'Músicas aprovadas', value: songsResult.count ?? 0, icon: Music, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Meus repertórios', value: repertoriesResult.count ?? 0, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ...(can(role, 'songs:approve') ? [{
      label: 'Aguardando aprovação',
      value: (pendingResult as any).count ?? 0,
      icon: ClipboardCheck,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    }] : []),
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-4xl font-black text-brand-900">
          Bom dia, {userName}! 👋
        </h1>
        <p className="text-gray-500 mt-2 text-lg">Confira o que está acontecendo no seu repertório.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-6 flex flex-col items-start gap-4 border-l-4 border-gold-400 hover:shadow-lg transition-shadow">
            <div className={`w-14 h-14 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
              <stat.icon className={`w-7 h-7 ${stat.color}`} />
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent repertories */}
        <div className="card">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="font-serif text-xl font-bold text-brand-900">Repertórios Recentes</h2>
            <div className="flex items-center gap-2">
              <Link href="/repertorios/novo" className="btn-primary py-1.5 px-3 text-xs">
                <Plus className="w-3.5 h-3.5" /> Novo
              </Link>
              <Link href="/repertorios" className="btn-ghost py-1.5 px-2">
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {recentRepertories.data?.length === 0 && (
              <div className="p-8 text-center">
                <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhum repertório ainda.</p>
                <Link href="/repertorios/novo" className="text-sm text-brand-600 font-medium mt-1 inline-block">
                  Criar o primeiro
                </Link>
              </div>
            )}
            {recentRepertories.data?.map((r) => (
              <Link
                key={r.id}
                href={`/repertorios/${r.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{CELEBRATION_ICONS[((r.celebration || 'outro') as CelebrationType)]}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 transition-colors">
                      {r.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {r.event_date ? formatDate(r.event_date) : timeAgo(r.created_at)}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-600 transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent songs */}
        <div className="card">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="font-serif text-xl font-bold text-brand-900">Músicas Recentes</h2>
            <div className="flex items-center gap-2">
              {can(role, 'songs:create') && (
                <Link href="/musicas/nova" className="btn-primary py-1.5 px-3 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Nova
                </Link>
              )}
              <Link href="/musicas" className="btn-ghost py-1.5 px-2">
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {recentSongs.data?.length === 0 && (
              <div className="p-8 text-center">
                <Music className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhuma música ainda.</p>
              </div>
            )}
            {recentSongs.data?.map((s) => (
              <Link
                key={s.id}
                href={`/musicas/${s.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 transition-colors">
                    {s.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {s.key_note ? `Tom: ${s.key_note} · ` : ''}{timeAgo(s.created_at)}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-600 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
