import type { UserRole, SongStatus, CelebrationType } from '@rl/types';

// ─── Role helpers ─────────────────────────────────────────────────────────────

export const ROLE_LEVELS: Record<UserRole, number> = {
  padrao: 1,
  intermediario: 2,
  master: 3,
  administrador: 4,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  padrao: 'Usuário Padrão',
  intermediario: 'Usuário Intermediário',
  master: 'Usuário Master',
  administrador: 'Administrador',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  padrao: '#F59E0B',
  intermediario: '#3B82F6',
  master: '#10B981',
  administrador: '#EF4444',
};

export function hasMinRole(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[minRole];
}

export function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_LEVELS[managerRole] > ROLE_LEVELS[targetRole];
}

// ─── Song helpers ─────────────────────────────────────────────────────────────

export const SONG_STATUS_LABELS: Record<SongStatus, string> = {
  draft: 'Rascunho',
  pending: 'Aguardando Aprovação',
  approved: 'Aprovada',
  rejected: 'Reprovada',
  revision_requested: 'Revisão Solicitada',
  archived: 'Arquivada',
};

export const SONG_STATUS_COLORS: Record<SongStatus, string> = {
  draft: '#6B7280',
  pending: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
  revision_requested: '#F97316',
  archived: '#9CA3AF',
};

export const KEY_NOTES = [
  'Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#',
  'Sol', 'Sol#', 'Lá', 'Lá#', 'Si',
  'Dóm', 'Dó#m', 'Rém', 'Ré#m', 'Mim', 'Fám', 'Fá#m',
  'Solm', 'Sol#m', 'Lám', 'Lá#m', 'Sim',
];

// ─── Celebration helpers ──────────────────────────────────────────────────────

export const CELEBRATION_LABELS: Record<CelebrationType, string> = {
  missa: 'Missa',
  adoracao: 'Adoração',
  grupo_oracao: 'Grupo de Oração',
  encontro: 'Encontro',
  outro: 'Outro',
};

export const CELEBRATION_ICONS: Record<CelebrationType, string> = {
  missa: '⛪',
  adoracao: '🙌',
  grupo_oracao: '🙏',
  encontro: '👥',
  outro: '📋',
};

// ─── Category slugs (nativas) ─────────────────────────────────────────────────

export const NATIVE_CATEGORIES = [
  { name: 'Canto de Entrada', slug: 'entrada', sort_order: 1 },
  { name: 'Ato Penitencial', slug: 'ato-penitencial', sort_order: 2 },
  { name: 'Glória', slug: 'gloria', sort_order: 3 },
  { name: 'Salmo Responsorial', slug: 'salmo', sort_order: 4 },
  { name: 'Aclamação ao Evangelho', slug: 'aclamacao-evangelho', sort_order: 5 },
  { name: 'Ofertório', slug: 'ofertorio', sort_order: 6 },
  { name: 'Santo', slug: 'santo', sort_order: 7 },
  { name: 'Cordeiro de Deus', slug: 'cordeiro', sort_order: 8 },
  { name: 'Comunhão', slug: 'comunhao', sort_order: 9 },
  { name: 'Pós-Comunhão', slug: 'pos-comunhao', sort_order: 10 },
  { name: 'Canto Final', slug: 'final', sort_order: 11 },
  { name: 'Mariana', slug: 'mariana', sort_order: 12 },
  { name: 'Espírito Santo', slug: 'espirito-santo', sort_order: 13 },
  { name: 'Adoração', slug: 'adoracao', sort_order: 14 },
  { name: 'Grupo de Oração', slug: 'grupo-oracao', sort_order: 15 },
  { name: 'Louvor', slug: 'louvor', sort_order: 16 },
];

// ─── Date formatters ──────────────────────────────────────────────────────────

export function formatDate(date: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', opts ?? { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(date));
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora mesmo';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days}d`;
  return formatDate(date);
}

// ─── String helpers ───────────────────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(text: string, maxLen = 80): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '…';
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

// ─── Permissions check ────────────────────────────────────────────────────────

export const PERMISSIONS: Record<string, UserRole[]> = {
  'songs:view':         ['padrao', 'intermediario', 'master', 'administrador'],
  'songs:create':       ['intermediario', 'master', 'administrador'],
  'songs:edit:own':     ['intermediario', 'master', 'administrador'],
  'songs:edit:any':     ['administrador'],
  'songs:approve':      ['master', 'administrador'],
  'songs:delete':       ['master', 'administrador'],
  'repertories:create':   ['padrao', 'intermediario', 'master', 'administrador'],
  'repertories:share':    ['padrao', 'intermediario', 'master', 'administrador'],
  'repertories:edit:any': ['master', 'administrador'],
  'repertories:delete:any': ['master', 'administrador'],
  'categories:create':  ['master', 'administrador'],
  'categories:edit':    ['master', 'administrador'],
  'users:view':         ['master', 'administrador'],
  'users:promote':      ['master', 'administrador'],
  'users:edit':         ['master', 'administrador'],
  'users:delete':       ['master', 'administrador'],
  'admin:settings':     ['administrador'],
  'admin:audit':        ['administrador'],
};

export function can(userRole: UserRole, permission: string): boolean {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  return allowedRoles.includes(userRole);
}
