-- ============================================================
-- 001_initial_schema.sql
-- Schema principal do Repertório Litúrgico
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- fuzzy text search

-- ─── Users ───────────────────────────────────────────────────
CREATE TABLE public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT NOT NULL,
  avatar_url    TEXT,
  phone         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON public.users(email);

-- ─── Roles ───────────────────────────────────────────────────
CREATE TABLE public.roles (
  id          SERIAL PRIMARY KEY,
  name        TEXT UNIQUE NOT NULL,
  label       TEXT NOT NULL,
  description TEXT,
  level       INT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Permissions ─────────────────────────────────────────────
CREATE TABLE public.permissions (
  id          SERIAL PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,
  description TEXT,
  module      TEXT NOT NULL
);

CREATE TABLE public.role_permissions (
  role_id       INT NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id INT NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ─── User Role Assignments ────────────────────────────────────
CREATE TABLE public.user_role_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_id     INT NOT NULL REFERENCES public.roles(id),
  assigned_by UUID REFERENCES public.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ,
  UNIQUE(user_id, role_id)
);

CREATE INDEX idx_ura_user ON public.user_role_assignments(user_id);

-- ─── Auth Identities ─────────────────────────────────────────
CREATE TABLE public.auth_identities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_id)
);

-- ─── Teams ───────────────────────────────────────────────────
CREATE TABLE public.teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url    TEXT,
  created_by  UUID REFERENCES public.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.team_members (
  team_id   UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

-- ─── Liturgical Categories ────────────────────────────────────
CREATE TABLE public.liturgical_categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  is_native   BOOLEAN NOT NULL DEFAULT false,
  sort_order  INT NOT NULL DEFAULT 0,
  team_id     UUID REFERENCES public.teams(id),
  created_by  UUID REFERENCES public.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_sort ON public.liturgical_categories(sort_order);

-- ─── Songs ───────────────────────────────────────────────────
CREATE TABLE public.songs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  subtitle     TEXT,
  author       TEXT,
  composer     TEXT,
  lyrics       TEXT NOT NULL,
  chords       TEXT,
  key_note     TEXT,
  bpm          INT,
  tags         TEXT[] NOT NULL DEFAULT '{}',
  observations TEXT,
  status       TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','pending','approved','rejected','revision_requested','archived')),
  team_id      UUID REFERENCES public.teams(id),
  created_by   UUID NOT NULL REFERENCES public.users(id),
  updated_by   UUID REFERENCES public.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_songs_status     ON public.songs(status);
CREATE INDEX idx_songs_created_by ON public.songs(created_by);
CREATE INDEX idx_songs_title_trgm ON public.songs USING gin(title gin_trgm_ops);
CREATE INDEX idx_songs_lyrics_fts ON public.songs USING gin(to_tsvector('portuguese', title || ' ' || lyrics));

-- Song ↔ Category junction
CREATE TABLE public.song_categories (
  song_id     UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES public.liturgical_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (song_id, category_id)
);

-- ─── Song Revisions ──────────────────────────────────────────
CREATE TABLE public.song_revisions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id     UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  version     INT NOT NULL,
  title       TEXT,
  lyrics      TEXT,
  chords      TEXT,
  changed_by  UUID NOT NULL REFERENCES public.users(id),
  change_note TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(song_id, version)
);

CREATE INDEX idx_revisions_song ON public.song_revisions(song_id, version DESC);

-- ─── Song Approvals ──────────────────────────────────────────
CREATE TABLE public.song_approvals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id      UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  revision_id  UUID REFERENCES public.song_revisions(id),
  submitted_by UUID NOT NULL REFERENCES public.users(id),
  reviewed_by  UUID REFERENCES public.users(id),
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','approved','rejected','revision_requested')),
  comment      TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at  TIMESTAMPTZ
);

CREATE INDEX idx_approvals_status  ON public.song_approvals(status);
CREATE INDEX idx_approvals_song    ON public.song_approvals(song_id);

-- ─── Repertories ─────────────────────────────────────────────
CREATE TABLE public.repertories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  celebration  TEXT CHECK (celebration IN ('missa','adoracao','grupo_oracao','encontro','outro')),
  event_date   DATE,
  community    TEXT,
  observations TEXT,
  is_public    BOOLEAN NOT NULL DEFAULT false,
  team_id      UUID REFERENCES public.teams(id),
  created_by   UUID NOT NULL REFERENCES public.users(id),
  updated_by   UUID REFERENCES public.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_repertories_created_by ON public.repertories(created_by);
CREATE INDEX idx_repertories_date       ON public.repertories(event_date DESC);
CREATE INDEX idx_repertories_team       ON public.repertories(team_id);

-- ─── Repertory Items ─────────────────────────────────────────
CREATE TABLE public.repertory_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repertory_id UUID NOT NULL REFERENCES public.repertories(id) ON DELETE CASCADE,
  song_id      UUID NOT NULL REFERENCES public.songs(id),
  position     INT NOT NULL,
  custom_key   TEXT,
  observations TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(repertory_id, position)
);

CREATE INDEX idx_ritems_repertory ON public.repertory_items(repertory_id, position);

-- ─── Shared Repertories ──────────────────────────────────────
CREATE TABLE public.shared_repertories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repertory_id UUID NOT NULL REFERENCES public.repertories(id) ON DELETE CASCADE,
  shared_with  UUID REFERENCES public.users(id),
  team_id      UUID REFERENCES public.teams(id),
  permission   TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view','edit')),
  shared_by    UUID NOT NULL REFERENCES public.users(id),
  shared_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ
);

-- ─── Audit Logs ──────────────────────────────────────────────
CREATE TABLE public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.users(id),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user   ON public.audit_logs(user_id);
CREATE INDEX idx_audit_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_date   ON public.audit_logs(created_at DESC);

-- ─── Updated_at trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_songs
  BEFORE UPDATE ON public.songs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_repertories
  BEFORE UPDATE ON public.repertories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
