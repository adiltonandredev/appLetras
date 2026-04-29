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
-- ============================================================
-- 002_rls_policies.sql
-- Row Level Security policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liturgical_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_revisions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_approvals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repertories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repertory_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_repertories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members         ENABLE ROW LEVEL SECURITY;

-- ─── Helper function: get user's role level ───────────────────
CREATE OR REPLACE FUNCTION public.get_user_role_level(p_user_id UUID)
RETURNS INT AS $$
  SELECT COALESCE(
    (SELECT r.level
     FROM public.user_role_assignments ura
     JOIN public.roles r ON r.id = ura.role_id
     WHERE ura.user_id = p_user_id
     LIMIT 1),
    1  -- default: padrao
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_at_least(min_level INT)
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role_level(auth.uid()) >= min_level;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── Users policies ──────────────────────────────────────────
-- Everyone authenticated can read their own profile
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (id = auth.uid() OR public.is_at_least(3));

-- Only self update own profile (master+ can update any)
CREATE POLICY "users_update" ON public.users
  FOR UPDATE USING (id = auth.uid() OR public.is_at_least(3));

-- Only admin can delete users
CREATE POLICY "users_delete" ON public.users
  FOR DELETE USING (public.is_at_least(4));

-- Insert is handled by trigger (on auth.users create)
CREATE POLICY "users_insert" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

-- ─── Roles & permissions (read-only for all authenticated) ────
CREATE POLICY "roles_select" ON public.roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "permissions_select" ON public.permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "role_permissions_select" ON public.role_permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ─── User Role Assignments ────────────────────────────────────
CREATE POLICY "ura_select" ON public.user_role_assignments
  FOR SELECT USING (user_id = auth.uid() OR public.is_at_least(3));

CREATE POLICY "ura_insert" ON public.user_role_assignments
  FOR INSERT WITH CHECK (public.is_at_least(3));

CREATE POLICY "ura_delete" ON public.user_role_assignments
  FOR DELETE USING (public.is_at_least(3));

-- ─── Liturgical Categories ────────────────────────────────────
-- All authenticated users can view
CREATE POLICY "categories_select" ON public.liturgical_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Master+ can create/edit/delete
CREATE POLICY "categories_insert" ON public.liturgical_categories
  FOR INSERT WITH CHECK (public.is_at_least(3));

CREATE POLICY "categories_update" ON public.liturgical_categories
  FOR UPDATE USING (public.is_at_least(3));

CREATE POLICY "categories_delete" ON public.liturgical_categories
  FOR DELETE USING (public.is_at_least(3) AND is_native = false);

-- ─── Songs ───────────────────────────────────────────────────
-- Approved songs visible to all; own songs always visible; master+ sees all
CREATE POLICY "songs_select" ON public.songs
  FOR SELECT USING (
    status = 'approved'
    OR created_by = auth.uid()
    OR public.is_at_least(3)
  );

-- Intermediario+ can insert
CREATE POLICY "songs_insert" ON public.songs
  FOR INSERT WITH CHECK (
    public.is_at_least(2) AND created_by = auth.uid()
  );

-- Own songs: intermediario can edit draft/rejected; master+ can edit any
CREATE POLICY "songs_update" ON public.songs
  FOR UPDATE USING (
    (created_by = auth.uid() AND status IN ('draft','revision_requested'))
    OR public.is_at_least(3)
  );

-- Only master+ can delete/archive
CREATE POLICY "songs_delete" ON public.songs
  FOR DELETE USING (public.is_at_least(3));

-- ─── Song Categories ─────────────────────────────────────────
CREATE POLICY "song_categories_select" ON public.song_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.songs s
      WHERE s.id = song_id
        AND (s.status = 'approved' OR s.created_by = auth.uid() OR public.is_at_least(3))
    )
  );

CREATE POLICY "song_categories_insert" ON public.song_categories
  FOR INSERT WITH CHECK (public.is_at_least(2));

CREATE POLICY "song_categories_delete" ON public.song_categories
  FOR DELETE USING (public.is_at_least(2));

-- ─── Song Revisions ──────────────────────────────────────────
CREATE POLICY "song_revisions_select" ON public.song_revisions
  FOR SELECT USING (
    changed_by = auth.uid() OR public.is_at_least(3)
  );

CREATE POLICY "song_revisions_insert" ON public.song_revisions
  FOR INSERT WITH CHECK (changed_by = auth.uid());

-- ─── Song Approvals ──────────────────────────────────────────
CREATE POLICY "song_approvals_select" ON public.song_approvals
  FOR SELECT USING (
    submitted_by = auth.uid() OR public.is_at_least(3)
  );

CREATE POLICY "song_approvals_insert" ON public.song_approvals
  FOR INSERT WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "song_approvals_update" ON public.song_approvals
  FOR UPDATE USING (public.is_at_least(3));

-- ─── Repertories ─────────────────────────────────────────────
-- Own repertories + public + shared
CREATE POLICY "repertories_select" ON public.repertories
  FOR SELECT USING (
    created_by = auth.uid()
    OR is_public = true
    OR public.is_at_least(3)
    OR EXISTS (
      SELECT 1 FROM public.shared_repertories sr
      WHERE sr.repertory_id = id AND sr.shared_with = auth.uid()
    )
  );

CREATE POLICY "repertories_insert" ON public.repertories
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "repertories_update" ON public.repertories
  FOR UPDATE USING (
    created_by = auth.uid()
    OR public.is_at_least(3)
    OR EXISTS (
      SELECT 1 FROM public.shared_repertories sr
      WHERE sr.repertory_id = id AND sr.shared_with = auth.uid() AND sr.permission = 'edit'
    )
  );

CREATE POLICY "repertories_delete" ON public.repertories
  FOR DELETE USING (created_by = auth.uid() OR public.is_at_least(3));

-- ─── Repertory Items ─────────────────────────────────────────
CREATE POLICY "repertory_items_select" ON public.repertory_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.repertories r
      WHERE r.id = repertory_id
        AND (r.created_by = auth.uid() OR r.is_public = true OR public.is_at_least(3))
    )
  );

CREATE POLICY "repertory_items_insert" ON public.repertory_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.repertories r
      WHERE r.id = repertory_id
        AND (r.created_by = auth.uid() OR public.is_at_least(3))
    )
  );

CREATE POLICY "repertory_items_update" ON public.repertory_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.repertories r
      WHERE r.id = repertory_id
        AND (r.created_by = auth.uid() OR public.is_at_least(3))
    )
  );

CREATE POLICY "repertory_items_delete" ON public.repertory_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.repertories r
      WHERE r.id = repertory_id
        AND (r.created_by = auth.uid() OR public.is_at_least(3))
    )
  );

-- ─── Shared Repertories ──────────────────────────────────────
CREATE POLICY "shared_repertories_select" ON public.shared_repertories
  FOR SELECT USING (
    shared_with = auth.uid() OR shared_by = auth.uid() OR public.is_at_least(3)
  );

CREATE POLICY "shared_repertories_insert" ON public.shared_repertories
  FOR INSERT WITH CHECK (shared_by = auth.uid() OR public.is_at_least(3));

CREATE POLICY "shared_repertories_delete" ON public.shared_repertories
  FOR DELETE USING (shared_by = auth.uid() OR public.is_at_least(3));

-- ─── Audit Logs ──────────────────────────────────────────────
-- Only admins can read
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (public.is_at_least(4));

-- Service role inserts (no user policy needed — done server-side)
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- ─── Teams ───────────────────────────────────────────────────
CREATE POLICY "teams_select" ON public.teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = id AND tm.user_id = auth.uid()
    ) OR public.is_at_least(4)
  );

CREATE POLICY "teams_insert" ON public.teams
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "teams_update" ON public.teams
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = id AND tm.user_id = auth.uid() AND tm.role = 'owner'
    ) OR public.is_at_least(4)
  );

CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT USING (user_id = auth.uid() OR public.is_at_least(3));

CREATE POLICY "team_members_insert" ON public.team_members
  FOR INSERT WITH CHECK (public.is_at_least(3));

CREATE POLICY "team_members_delete" ON public.team_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR public.is_at_least(3)
  );
-- ============================================================
-- 003_auth_trigger.sql
-- Trigger: cria user em public.users quando faz signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id INT;
BEGIN
  -- Insert into public.users
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
        updated_at = now();

  -- Assign default role (padrao = level 1)
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'padrao' LIMIT 1;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.user_role_assignments (user_id, role_id)
    VALUES (NEW.id, v_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also fire on login to update last_login_at
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET last_login_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_login ON auth.sessions;

CREATE TRIGGER on_auth_user_login
  AFTER INSERT ON auth.sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_login();
-- ============================================================
-- seed.sql — Dados iniciais do Repertório Litúrgico
-- Execute após as migrations
-- ============================================================

-- ─── Roles ───────────────────────────────────────────────────
INSERT INTO public.roles (name, label, description, level) VALUES
  ('padrao',        'Usuário Padrão',        'Acesso básico: visualizar músicas, criar repertórios', 1),
  ('intermediario', 'Usuário Intermediário', 'Pode cadastrar músicas (sujeitas à aprovação)',          2),
  ('master',        'Usuário Master',        'Gerencia conteúdo, categorias e usuários de nível inferior', 3),
  ('administrador', 'Administrador',         'Acesso total ao sistema',                               4)
ON CONFLICT (name) DO NOTHING;

-- ─── Permissions ─────────────────────────────────────────────
INSERT INTO public.permissions (code, description, module) VALUES
  -- Songs
  ('songs:view',         'Visualizar músicas aprovadas',          'songs'),
  ('songs:create',       'Criar novas músicas',                   'songs'),
  ('songs:edit:own',     'Editar próprias músicas',               'songs'),
  ('songs:edit:any',     'Editar qualquer música',                'songs'),
  ('songs:approve',      'Aprovar ou reprovar músicas',           'songs'),
  ('songs:delete',       'Excluir músicas',                       'songs'),
  -- Repertories
  ('repertories:create', 'Criar repertórios',                     'repertories'),
  ('repertories:edit:own','Editar próprios repertórios',          'repertories'),
  ('repertories:edit:any','Editar qualquer repertório',           'repertories'),
  ('repertories:share',  'Compartilhar repertórios',              'repertories'),
  ('repertories:print',  'Imprimir e exportar PDF',               'repertories'),
  -- Categories
  ('categories:view',    'Visualizar categorias',                 'categories'),
  ('categories:create',  'Criar categorias',                      'categories'),
  ('categories:edit',    'Editar categorias',                     'categories'),
  ('categories:delete',  'Excluir categorias personalizadas',     'categories'),
  -- Users
  ('users:view',         'Ver lista de usuários',                 'users'),
  ('users:promote',      'Promover usuários de nível',            'users'),
  ('users:edit',         'Editar dados de usuários',              'users'),
  ('users:delete',       'Excluir usuários',                      'users'),
  -- Admin
  ('admin:settings',     'Acessar configurações globais',         'admin'),
  ('admin:audit',        'Acessar logs de auditoria',             'admin')
ON CONFLICT (code) DO NOTHING;

-- ─── Role ↔ Permission mapping ────────────────────────────────
-- Padrão (level 1)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'padrao'
  AND p.code IN (
    'songs:view',
    'repertories:create', 'repertories:edit:own', 'repertories:share', 'repertories:print',
    'categories:view'
  )
ON CONFLICT DO NOTHING;

-- Intermediário (level 2)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'intermediario'
  AND p.code IN (
    'songs:view', 'songs:create', 'songs:edit:own',
    'repertories:create', 'repertories:edit:own', 'repertories:share', 'repertories:print',
    'categories:view'
  )
ON CONFLICT DO NOTHING;

-- Master (level 3)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'master'
  AND p.code IN (
    'songs:view', 'songs:create', 'songs:edit:own', 'songs:approve', 'songs:delete',
    'repertories:create', 'repertories:edit:own', 'repertories:edit:any', 'repertories:share', 'repertories:print',
    'categories:view', 'categories:create', 'categories:edit', 'categories:delete',
    'users:view', 'users:promote', 'users:edit', 'users:delete'
  )
ON CONFLICT DO NOTHING;

-- Administrador (level 4) — all permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name = 'administrador'
ON CONFLICT DO NOTHING;

-- ─── Liturgical Categories (Nativas) ─────────────────────────
INSERT INTO public.liturgical_categories (name, slug, is_native, sort_order) VALUES
  ('Canto de Entrada',          'entrada',            true,  1),
  ('Ato Penitencial',           'ato-penitencial',    true,  2),
  ('Glória',                    'gloria',             true,  3),
  ('Salmo Responsorial',        'salmo',              true,  4),
  ('Aclamação ao Evangelho',    'aclamacao-evangelho',true,  5),
  ('Ofertório',                 'ofertorio',          true,  6),
  ('Santo',                     'santo',              true,  7),
  ('Cordeiro de Deus',          'cordeiro',           true,  8),
  ('Comunhão',                  'comunhao',           true,  9),
  ('Pós-Comunhão',              'pos-comunhao',       true, 10),
  ('Canto Final',               'final',              true, 11),
  ('Mariana',                   'mariana',            true, 12),
  ('Espírito Santo',            'espirito-santo',     true, 13),
  ('Adoração',                  'adoracao',           true, 14),
  ('Grupo de Oração',           'grupo-oracao',       true, 15),
  ('Louvor',                    'louvor',             true, 16)
ON CONFLICT (slug) DO NOTHING;

-- ─── Done ─────────────────────────────────────────────────────
DO $$ BEGIN
  RAISE NOTICE 'Seed concluído: roles, permissions, role_permissions e categories inseridos.';
END $$;
