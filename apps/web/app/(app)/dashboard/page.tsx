import type { Metadata } from 'next';
import type { CelebrationType } from '@rl/types';
import { createClient } from '@/lib/supabase/server';
import { getCurrentRole } from '@/lib/auth/permissions';
import { can } from '@rl/utils';
import {
  Music, BookOpen, ClipboardCheck, Plus, ArrowRight,
  Users, Tag, CalendarDays, User, ListMusic, PlusCircle,
} from 'lucide-react';
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
  const isAdmin = can(role, 'users:view'); // nível 4 — admin/master

  const [songsResult, repertoriesResult, pendingResult] = await Promise.all([
    supabase.from('songs').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    // Admin vê total do sistema; outros veem apenas os próprios
    isAdmin
      ? supabase.from('repertories').select('id', { count: 'exact', head: true })
      : supabase.from('repertories').select('id', { count: 'exact', head: true }).eq('created_by', session.user.id),
    can(role, 'songs:approve')
      ? supabase.from('song_approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      : Promise.resolve({ count: 0, error: null }),
  ]);

  const [recentRepertories, recentSongs] = await Promise.all([
    // Admin vê os mais recentes do sistema; outros veem os seus
    isAdmin
      ? supabase.from('repertories')
          .select('id, title, celebration, event_date, created_at')
          .order('created_at', { ascending: false })
          .limit(5)
      : supabase.from('repertories')
          .select('id, title, celebration, event_date, created_at')
          .eq('created_by', session.user.id)
          .order('created_at', { ascending: false })
          .limit(5),
    supabase.from('songs')
      .select('id, title, status, created_at, key_note')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  // Quick access links — role-aware
  const quickLinks = [
    {
      label: 'Nova Música',
      href: '/musicas/nova',
      icon: PlusCircle,
      color: 'text-brand-600',
      bg: 'bg-brand-50',
      border: 'border-brand-200',
      show: can(role, 'songs:create'),
    },
    {
      label: 'Novo Repertório',
      href: '/repertorios/novo',
      icon: ListMusic,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      show: true,
    },
    {
      label: 'Músicas',
      href: '/musicas',
      icon: Music,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      show: true,
    },
    {
      label: 'Repertórios',
      href: '/repertorios',
      icon: BookOpen,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      show: true,
    },
    {
      label: 'Aprovações',
      href: '/admin/aprovacoes',
      icon: ClipboardCheck,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      show: can(role, 'songs:approve'),
    },
    {
      label: 'Usuários',
      href: '/admin/usuarios',
      icon: Users,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      show: can(role, 'users:view'),
    },
    {
      label: 'Categorias',
      href: '/admin/categorias',
      icon: Tag,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      show: can(role, 'categories:create'),
    },
    {
      label: 'Celebrações',
      href: '/admin/celebracoes',
      icon: CalendarDays,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      show: can(role, 'categories:create'),
    },
    {
      label: 'Meu Perfil',
      href: '/perfil',
      icon: User,
      color: 'text-gray-600',
      bg: 'bg-gray-100',
      border: 'border-gray-200',
      show: true,
    },
  ].filter(l => l.show);

  const stats = [
    { label: 'Músicas aprovadas', value: songsResult.count ?? 0, icon: Music, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: isAdmin ? 'Total de repertórios' : 'Meus repertórios', value: repertoriesResult.count ?? 0, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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
        <h1 className="font-serif text-3xl sm:text-4xl font-black text-brand-900">
          Bom dia, {userName}! 👋
        </h1>
        <p className="text-gray-500 mt-1 text-sm sm:text-lg">Confira o que está acontecendo no seu repertório.</p>
      </div>

      {/* Quick access — visível em mobile e desktop */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Acesso Rápido
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-9 gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border ${link.border} ${link.bg} hover:shadow-md active:scale-95 hover:scale-105 transition-all group`}
            >
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${link.bg} group-hover:scale-110 transition-transform`}>
                <link.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${link.color}`} />
              </div>
              <span className={`text-[10px] sm:text-xs font-semibold text-center leading-tight ${link.color}`}>
                {link.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats — oculto no mobile */}
      <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

      {/* Últimos Repertórios + Músicas — oculto no mobile */}
      <div className="hidden sm:grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent repertories */}
        <div className="card">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="font-serif text-xl font-bold text-brand-900">{isAdmin ? 'Últimos Repertórios' : 'Repertórios Recentes'}</h2>
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

      {/* Footer do desenvolvedor */}
      <footer className="border-t border-gray-100 pt-6 pb-2 mt-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div>
            <p className="text-xs text-gray-400">Desenvolvido por</p>
            <p className="text-sm font-semibold text-gray-700 mt-0.5">Adilton André</p>
          </div>

          {/* Redes sociais */}
          <div className="flex items-center gap-3">
            {/* Instagram */}
            <a
              href="https://instagram.com/adiltonandremcs"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white hover:scale-110 transition-transform shadow-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>

            {/* Facebook */}
            <a
              href="https://facebook.com/adiltonandre"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="w-8 h-8 rounded-full flex items-center justify-center bg-[#1877F2] text-white hover:scale-110 transition-transform shadow-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>

            {/* WhatsApp */}
            <a
              href="https://wa.me/5569999772514"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="w-8 h-8 rounded-full flex items-center justify-center bg-[#25D366] text-white hover:scale-110 transition-transform shadow-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>

            {/* LinkedIn */}
            <a
              href="https://linkedin.com/in/adiltonandre"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="w-8 h-8 rounded-full flex items-center justify-center bg-[#0A66C2] text-white hover:scale-110 transition-transform shadow-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>

            {/* GitHub */}
            <a
              href="https://github.com/adiltonandre"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-800 text-white hover:scale-110 transition-transform shadow-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
            </a>
          </div>

          <p className="text-[10px] text-gray-300">
            © {new Date().getFullYear()} APPLetras · Todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}
