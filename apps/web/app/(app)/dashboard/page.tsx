import type { Metadata } from 'next';
import type { CelebrationType } from '@rl/types';
import { createClient } from '@/lib/supabase/server';
import { getCurrentRole } from '@/lib/auth/permissions';
import { can } from '@rl/utils';
import {
  Music, BookOpen, ClipboardCheck, Plus, ArrowRight,
  Users, Tag, CalendarDays, User, ListMusic, PlusCircle, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate, timeAgo, CELEBRATION_ICONS } from '@rl/utils';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const role = await getCurrentRole(session.user.id);
  const fullName = session.user.user_metadata?.full_name ?? 'usuário';
  const firstName = fullName.split(' ')[0];
  const avatarUrl = session.user.user_metadata?.avatar_url as string | undefined;

  const isAdmin = can(role, 'users:view');

  const [songsResult, repertoriesResult, pendingResult] = await Promise.all([
    supabase.from('songs').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    isAdmin
      ? supabase.from('repertories').select('id', { count: 'exact', head: true })
      : supabase.from('repertories').select('id', { count: 'exact', head: true }).eq('created_by', session.user.id),
    can(role, 'songs:approve')
      ? supabase.from('song_approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      : Promise.resolve({ count: 0, error: null }),
  ]);

  const [recentRepertories, recentSongs] = await Promise.all([
    isAdmin
      ? supabase.from('repertories').select('id, title, celebration, event_date, created_at').order('created_at', { ascending: false }).limit(4)
      : supabase.from('repertories').select('id, title, celebration, event_date, created_at').eq('created_by', session.user.id).order('created_at', { ascending: false }).limit(4),
    supabase.from('songs').select('id, title, created_at, key_note').eq('status', 'approved').order('created_at', { ascending: false }).limit(4),
  ]);

  const quickLinks = [
    { label: 'Nova Música',     href: '/musicas/nova',       icon: PlusCircle,     color: 'text-brand-600',   bg: 'bg-brand-50',   shadow: 'shadow-brand-100',  show: can(role, 'songs:create') },
    { label: 'Repertório',      href: '/repertorios/novo',   icon: ListMusic,      color: 'text-emerald-600', bg: 'bg-emerald-50', shadow: 'shadow-emerald-100', show: true },
    { label: 'Músicas',         href: '/musicas',            icon: Music,          color: 'text-blue-600',    bg: 'bg-blue-50',    shadow: 'shadow-blue-100',   show: true },
    { label: 'Repertórios',     href: '/repertorios',        icon: BookOpen,       color: 'text-violet-600',  bg: 'bg-violet-50',  shadow: 'shadow-violet-100', show: true },
    { label: 'Aprovações',      href: '/admin/aprovacoes',   icon: ClipboardCheck, color: 'text-amber-600',   bg: 'bg-amber-50',   shadow: 'shadow-amber-100',  show: can(role, 'songs:approve') },
    { label: 'Usuários',        href: '/admin/usuarios',     icon: Users,          color: 'text-rose-600',    bg: 'bg-rose-50',    shadow: 'shadow-rose-100',   show: can(role, 'users:view') },
    { label: 'Categorias',      href: '/admin/categorias',   icon: Tag,            color: 'text-teal-600',    bg: 'bg-teal-50',    shadow: 'shadow-teal-100',   show: can(role, 'categories:create') },
    { label: 'Celebrações',     href: '/admin/celebracoes',  icon: CalendarDays,   color: 'text-indigo-600',  bg: 'bg-indigo-50',  shadow: 'shadow-indigo-100', show: can(role, 'categories:create') },
    { label: 'Perfil',          href: '/perfil',             icon: User,           color: 'text-gray-500',    bg: 'bg-gray-100',   shadow: 'shadow-gray-100',   show: true },
  ].filter(l => l.show);

  const statsData = [
    { label: 'Músicas',      value: songsResult.count ?? 0,      icon: Music,         color: 'text-blue-500' },
    { label: isAdmin ? 'Repertórios' : 'Meus Rep.', value: repertoriesResult.count ?? 0, icon: BookOpen, color: 'text-emerald-500' },
    ...(can(role, 'songs:approve') ? [{ label: 'Pendentes', value: (pendingResult as any).count ?? 0, icon: ClipboardCheck, color: 'text-amber-500' }] : []),
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="max-w-2xl lg:max-w-6xl mx-auto space-y-5">

      {/* ── Hero Banner ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-5 sm:p-7 text-white">
        {/* Decoração de fundo */}
        <div className="pointer-events-none absolute -right-10 -top-10 w-52 h-52 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute right-10 -bottom-8 w-32 h-32 rounded-full bg-gold-400/15" />
        <div className="pointer-events-none absolute -left-6 bottom-0 w-24 h-24 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-4">
          {/* Avatar */}
          {avatarUrl ? (
            <img src={avatarUrl} alt={firstName} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/20 shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500 flex items-center justify-center text-brand-900 font-black text-xl shrink-0 ring-2 ring-white/20">
              {firstName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-white/60 text-xs font-medium">{greeting} 👋</p>
            <h1 className="text-xl sm:text-2xl font-black font-serif leading-tight truncate">{firstName}</h1>
            <p className="text-white/50 text-xs mt-0.5 hidden sm:block">
              Confira o que está acontecendo no seu repertório.
            </p>
          </div>

          <Link
            href="/perfil"
            className="shrink-0 text-white/40 hover:text-white/80 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Stats inline no banner */}
        <div className="relative mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-2">
          {statsData.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-black leading-none">{s.value}</p>
              <p className="text-[11px] text-white/50 mt-0.5 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Acesso Rápido ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Acesso Rápido</p>
        </div>

        {/* Grid estilo app-icons */}
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-9 gap-3 sm:gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div className={`w-full aspect-square max-w-[64px] mx-auto rounded-2xl ${link.bg} shadow-sm flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-transform`}>
                <link.icon className={`w-6 h-6 ${link.color}`} />
              </div>
              <span className={`text-[10px] sm:text-xs font-semibold text-center leading-tight ${link.color} opacity-80`}>
                {link.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recentes ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Últimos Repertórios */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="font-bold text-gray-800 text-sm">
                {isAdmin ? 'Últimos Repertórios' : 'Meus Repertórios'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Link href="/repertorios/novo" className="btn-primary py-1 px-2.5 text-xs">
                <Plus className="w-3 h-3" />
              </Link>
              <Link href="/repertorios" className="btn-ghost p-1.5">
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {recentRepertories.data?.length === 0 ? (
              <div className="py-10 text-center">
                <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhum repertório ainda.</p>
                <Link href="/repertorios/novo" className="text-xs text-brand-600 font-semibold mt-1.5 inline-block">
                  Criar o primeiro →
                </Link>
              </div>
            ) : recentRepertories.data?.map((r) => (
              <Link
                key={r.id}
                href={`/repertorios/${r.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors group"
              >
                <span className="text-xl shrink-0">{CELEBRATION_ICONS[((r.celebration || 'outro') as CelebrationType)]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-brand-700 transition-colors truncate">
                    {r.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {r.event_date ? formatDate(r.event_date) : timeAgo(r.created_at)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* Músicas Recentes */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Music className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-bold text-gray-800 text-sm">Músicas Recentes</span>
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
              <Link
                key={s.id}
                href={`/musicas/${s.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors group"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Music className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-brand-700 transition-colors truncate">
                    {s.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {s.key_note ? `Tom ${s.key_note} · ` : ''}{timeAgo(s.created_at)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
