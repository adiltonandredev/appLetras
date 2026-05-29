import type { Metadata } from 'next';
import type { CelebrationType } from '@rl/types';
import { createClient } from '@/lib/supabase/server';
import { getCurrentRole } from '@/lib/auth/permissions';
import { can } from '@rl/utils';
import {
  Music, BookOpen, ClipboardCheck, Plus, ArrowRight,
  Users, Tag, CalendarDays, User, ListMusic, PlusCircle, ChevronRight, BookMarked,
} from 'lucide-react';
// Music, BookOpen, ClipboardCheck também usados em statsData via iconName string
import Link from 'next/link';
import { formatDate, timeAgo, CELEBRATION_ICONS, CELEBRATION_LABELS } from '@rl/utils';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import type { StatItem } from '@/components/dashboard/DashboardStats';
import { RecentlyViewedSongs } from '@/components/dashboard/RecentlyViewedSongs';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const role = await getCurrentRole(session.user.id);
  const firstName = (session.user.user_metadata?.full_name ?? 'usuário').split(' ')[0];

  const isAdmin = can(role, 'users:view');
  const isPadrao = role === 'padrao';

  // Para usuário padrão: busca IDs de repertórios compartilhados via RPC (SECURITY DEFINER)
  let sharedRepIds: string[] = [];
  if (isPadrao) {
    const { data: rpcResult } = await supabase
      .rpc('get_shared_repertory_ids', { p_user_id: session.user.id });
    sharedRepIds = (rpcResult ?? []).map((r: any) => r.repertory_id as string).filter(Boolean);
  }

  const [songsResult, repertoriesResult, pendingResult] = await Promise.all([
    supabase.from('songs').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    isAdmin
      ? supabase.from('repertories').select('id', { count: 'exact', head: true })
      : isPadrao
        ? Promise.resolve({ count: sharedRepIds.length, error: null })
        : supabase.from('repertories').select('id', { count: 'exact', head: true }).eq('created_by', session.user.id),
    can(role, 'songs:approve')
      ? supabase.from('song_approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      : Promise.resolve({ count: 0, error: null }),
  ]);

  const REP_SELECT = 'id, title, celebration, event_date, created_at, community, creator:users!created_by(full_name)';

  const [recentRepertories, recentSongs] = await Promise.all([
    isAdmin
      ? supabase.from('repertories').select(REP_SELECT).order('created_at', { ascending: false }).limit(4)
      : isPadrao
        ? sharedRepIds.length > 0
          ? supabase.from('repertories').select(REP_SELECT).in('id', sharedRepIds).order('event_date', { ascending: false }).limit(4)
          : Promise.resolve({ data: [], error: null })
        : supabase.from('repertories').select(REP_SELECT).eq('created_by', session.user.id).order('created_at', { ascending: false }).limit(4),
    supabase.from('songs').select('id, title, created_at, key_note').eq('status', 'approved').order('created_at', { ascending: false }).limit(4),
  ]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  // URL da Liturgia do Dia — o site exibe o dia atual automaticamente
  const liturgiaUrl = 'https://liturgia.cancaonova.com/pb/';

  const quickLinks = [
    { label: 'Músicas',         href: '/musicas',             icon: Music,          color: 'text-blue-600',    bg: 'bg-blue-50',    show: true },
    { label: 'Repertórios',     href: '/repertorios',         icon: BookOpen,       color: 'text-violet-600',  bg: 'bg-violet-50',  show: true },
    { label: 'Liturgia do Dia', href: liturgiaUrl,            icon: BookMarked,     color: 'text-orange-600',  bg: 'bg-orange-50',  show: true, external: true },
    { label: 'Nova Música',     href: '/musicas/nova',        icon: PlusCircle,     color: 'text-brand-600',   bg: 'bg-brand-50',   show: can(role, 'songs:create') },
    { label: 'Novo Repertório', href: '/repertorios/novo',    icon: ListMusic,      color: 'text-emerald-600', bg: 'bg-emerald-50', show: can(role, 'repertories:create') },
    { label: 'Aprovações',      href: '/admin/aprovacoes',    icon: ClipboardCheck, color: 'text-amber-600',   bg: 'bg-amber-50',   show: can(role, 'songs:approve') },
    { label: 'Usuários',        href: '/admin/usuarios',      icon: Users,          color: 'text-rose-600',    bg: 'bg-rose-50',    show: can(role, 'users:view') },
    { label: 'Categorias',      href: '/admin/categorias',    icon: Tag,            color: 'text-teal-600',    bg: 'bg-teal-50',    show: can(role, 'categories:create') },
    { label: 'Celebrações',     href: '/admin/celebracoes',   icon: CalendarDays,   color: 'text-indigo-600',  bg: 'bg-indigo-50',  show: can(role, 'categories:create') },
    { label: 'Perfil',          href: '/perfil',              icon: User,           color: 'text-gray-500',    bg: 'bg-gray-100',   show: true },
  ].filter(l => l.show);

  const statsData: StatItem[] = [
    { label: 'Músicas aprovadas',   value: songsResult.count ?? 0,            iconName: 'Music',         color: 'text-blue-500',    bg: 'bg-blue-50' },
    { label: isAdmin ? 'Total repertórios' : 'Meus repertórios', value: repertoriesResult.count ?? 0, iconName: 'BookOpen', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    ...(can(role, 'songs:approve') ? [{ label: 'Aguardando aprovação', value: (pendingResult as any).count ?? 0, iconName: 'ClipboardCheck' as const, color: 'text-amber-500', bg: 'bg-amber-50' }] : []),
  ];

  return (
    <div className="max-w-2xl lg:max-w-6xl mx-auto space-y-6">

      {/* ── Saudação ─────────────────────────────── */}
      <div>
        <p className="text-sm text-gray-400 font-medium">{greeting} 👋</p>
        <h1 className="text-2xl sm:text-3xl font-black font-serif text-gray-900 mt-0.5">
          Olá, {firstName}!
        </h1>
      </div>

      {/* ── Acesso Rápido — destaque principal ────── */}
      <div className="card p-4 sm:p-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Acesso Rápido</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-3 sm:gap-4">
          {quickLinks.map((link, i) => {
            const inner = (
              <>
                <div className={`quick-icon-box ${link.bg}`}>
                  <link.icon className={`w-8 h-8 sm:w-7 sm:h-7 ${link.color}`} />
                </div>
                <span className={`text-xs font-semibold text-center leading-tight ${link.color}`}>
                  {link.label}
                </span>
              </>
            );
            return link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="quick-icon"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {inner}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="quick-icon"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Estatísticas — oculto para usuário padrão ── */}
      {!isPadrao && <DashboardStats stats={statsData} />}

      {/* ── Recentes ─────────────────────────────── */}
      <div className={`grid grid-cols-1 gap-4 ${!isPadrao ? 'lg:grid-cols-3' : ''}`}>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">
                {isAdmin ? 'Últimos Repertórios' : isPadrao ? 'Repertórios Compartilhados' : 'Meus Repertórios'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {!isPadrao && (
                <Link href="/repertorios/novo" className="btn-primary py-1 px-2.5 text-xs">
                  <Plus className="w-3 h-3" />
                </Link>
              )}
              <Link href="/repertorios" className="btn-ghost p-1.5">
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {recentRepertories.data?.length === 0 ? (
              <div className="py-10 text-center">
                <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  {isPadrao ? 'Nenhum repertório compartilhado ainda.' : 'Nenhum repertório ainda.'}
                </p>
                {!isPadrao && (
                  <Link href="/repertorios/novo" className="text-xs text-brand-600 font-semibold mt-1.5 inline-block">Criar o primeiro →</Link>
                )}
              </div>
            ) : recentRepertories.data?.map((r: any) => (
              <Link key={r.id} href={`/repertorios/${r.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-lg leading-none">{CELEBRATION_ICONS[((r.celebration || 'outro') as CelebrationType)]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-brand-700 transition-colors truncate">{r.title}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                    {r.celebration && (
                      <span className="text-xs text-emerald-600 font-medium">
                        {CELEBRATION_LABELS[(r.celebration as CelebrationType)]}
                      </span>
                    )}
                    {r.community && (
                      <span className="text-xs text-gray-400 truncate">{r.community}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-x-2 mt-0.5">
                    <p className="text-xs text-gray-400">
                      {r.event_date ? formatDate(r.event_date) : timeAgo(r.created_at)}
                    </p>
                    {r.creator?.full_name && (
                      <span className="text-xs text-gray-300">·</span>
                    )}
                    {r.creator?.full_name && (
                      <p className="text-xs text-gray-400 truncate">por {r.creator.full_name}</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
              </Link>
            ))}
          </div>
        </div>

        {!isPadrao && <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Music className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">Músicas Recentes</span>
            </div>
            <div className="flex items-center gap-1">
              {can(role, 'songs:create') && (
                <Link href="/musicas/nova" className="btn-primary py-1 px-2.5 text-xs">
                  <Plus className="w-3 h-3" />
                </Link>
              )}
              <Link href="/musicas" className="btn-ghost p-1.5">
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {recentSongs.data?.length === 0 ? (
              <div className="py-10 text-center">
                <Music className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhuma música ainda.</p>
              </div>
            ) : recentSongs.data?.map((s) => (
              <Link key={s.id} href={`/musicas/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Music className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 group-hover:text-brand-700 transition-colors truncate">{s.title}</p>
                  <p className="text-xs text-gray-400">{s.key_note ? `Tom ${s.key_note} · ` : ''}{timeAgo(s.created_at)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </Link>
            ))}
          </div>
        </div>}

        {/* Músicas abertas recentemente (client-side localStorage) */}
        {!isPadrao && <RecentlyViewedSongs />}

      </div>
    </div>
  );
}
