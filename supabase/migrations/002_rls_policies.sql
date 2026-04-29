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
