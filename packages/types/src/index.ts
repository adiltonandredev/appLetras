// ─── Enums / Literals ────────────────────────────────────────────────────────

export type UserRole = 'padrao' | 'intermediario' | 'master' | 'administrador';

export type SongStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'revision_requested'
  | 'archived';

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'revision_requested';

export type CelebrationType =
  | 'missa'
  | 'adoracao'
  | 'grupo_oracao'
  | 'encontro'
  | 'outro';

export type SharePermission = 'view' | 'edit';

export type AuthProvider = 'google' | 'facebook' | 'email';

export type TeamRole = 'owner' | 'admin' | 'member';

// ─── Domain Entities ─────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  phone?: string | null;
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
  // joined from user_role_assignments
  role?: UserRole;
}

export interface Role {
  id: number;
  name: UserRole;
  label: string;
  description?: string;
  level: number;
  created_at: string;
}

export interface Permission {
  id: number;
  code: string;
  description?: string;
  module: string;
}

export interface AuthIdentity {
  id: string;
  user_id: string;
  provider: AuthProvider;
  provider_id: string;
  created_at: string;
}

export interface LiturgicalCategory {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  is_native: boolean;
  sort_order: number;
  team_id?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface Song {
  id: string;
  title: string;
  subtitle?: string | null;
  author?: string | null;
  composer?: string | null;
  lyrics: string;
  chords?: string | null;
  key_note?: string | null;
  bpm?: number | null;
  tags: string[];
  observations?: string | null;
  status: SongStatus;
  team_id?: string | null;
  created_by: string;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  // joined
  categories?: LiturgicalCategory[];
  creator?: Pick<User, 'id' | 'full_name' | 'avatar_url'>;
}

export interface SongRevision {
  id: string;
  song_id: string;
  version: number;
  title?: string | null;
  lyrics?: string | null;
  chords?: string | null;
  changed_by: string;
  change_note?: string | null;
  created_at: string;
  // joined
  author?: Pick<User, 'id' | 'full_name' | 'avatar_url'>;
}

export interface SongApproval {
  id: string;
  song_id: string;
  revision_id?: string | null;
  submitted_by: string;
  reviewed_by?: string | null;
  status: ApprovalStatus;
  comment?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  // joined
  submitter?: Pick<User, 'id' | 'full_name' | 'avatar_url'>;
  reviewer?: Pick<User, 'id' | 'full_name' | 'avatar_url'>;
  song?: Pick<Song, 'id' | 'title' | 'status'>;
}

export interface Repertory {
  id: string;
  title: string;
  celebration?: CelebrationType | null;
  event_date?: string | null;
  community?: string | null;
  observations?: string | null;
  is_public: boolean;
  team_id?: string | null;
  created_by: string;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  // joined
  items?: RepertoryItem[];
  creator?: Pick<User, 'id' | 'full_name' | 'avatar_url'>;
  _count?: { items: number };
}

export interface RepertoryItem {
  id: string;
  repertory_id: string;
  song_id: string;
  position: number;
  custom_key?: string | null;
  observations?: string | null;
  created_at: string;
  // joined
  song?: Song;
}

export interface SharedRepertory {
  id: string;
  repertory_id: string;
  shared_with?: string | null;
  team_id?: string | null;
  permission: SharePermission;
  shared_by: string;
  shared_at: string;
  expires_at?: string | null;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  created_by: string;
  created_at: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
  // joined
  user?: Pick<User, 'id' | 'full_name' | 'avatar_url' | 'email'>;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  entity_type?: string | null;
  entity_id?: string | null;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  // joined
  user?: Pick<User, 'id' | 'full_name' | 'avatar_url'>;
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface CreateSongPayload {
  title: string;
  subtitle?: string;
  author?: string;
  composer?: string;
  lyrics: string;
  chords?: string;
  key_note?: string;
  bpm?: number;
  tags?: string[];
  observations?: string;
  category_ids?: number[];
}

export type UpdateSongPayload = Partial<CreateSongPayload>;

export interface CreateRepertoryPayload {
  title: string;
  celebration?: CelebrationType;
  event_date?: string;
  community?: string;
  observations?: string;
  is_public?: boolean;
}

export type UpdateRepertoryPayload = Partial<CreateRepertoryPayload>;

export interface AddRepertoryItemPayload {
  song_id: string;
  position?: number;
  custom_key?: string;
  observations?: string;
}

export interface ReorderRepertoryPayload {
  items: { id: string; position: number }[];
}

export interface ApproveRejectPayload {
  comment?: string;
}

export interface ShareRepertoryPayload {
  shared_with?: string;
  team_id?: string;
  permission?: SharePermission;
  expires_at?: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
}

// ─── Filter Params ────────────────────────────────────────────────────────────

export interface SongFilters extends PaginationParams {
  q?: string;
  status?: SongStatus;
  category_id?: number;
  key_note?: string;
  tags?: string[];
  created_by?: string;
}

export interface RepertoryFilters extends PaginationParams {
  q?: string;
  celebration?: CelebrationType;
  event_date_from?: string;
  event_date_to?: string;
  created_by?: string;
}

export interface UserFilters extends PaginationParams {
  q?: string;
  role?: UserRole;
  is_active?: boolean;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthSession {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
}

// ─── Offline ──────────────────────────────────────────────────────────────────

export interface OfflineRepertory extends Repertory {
  downloaded_at: string;
  items: (RepertoryItem & { song: Song & { categories: LiturgicalCategory[] } })[];
}

export interface SyncDelta {
  songs: Song[];
  repertories: Repertory[];
  categories: LiturgicalCategory[];
  last_sync: string;
}
