-- ============================================================
-- 005_groups_sharing.sql
-- Corrige RLS para grupos e compartilhamento de repertórios
-- ============================================================

-- ─── RLS: teams (grupos) ─────────────────────────────────────
-- Qualquer autenticado pode ver grupos dos quais é membro ou que criou
DROP POLICY IF EXISTS "teams_select"  ON public.teams;
DROP POLICY IF EXISTS "teams_insert"  ON public.teams;
DROP POLICY IF EXISTS "teams_update"  ON public.teams;
DROP POLICY IF EXISTS "teams_delete"  ON public.teams;

CREATE POLICY "teams_select" ON public.teams
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "teams_insert" ON public.teams
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "teams_update" ON public.teams
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = id AND tm.user_id = auth.uid() AND tm.role = 'admin'
    )
  );

CREATE POLICY "teams_delete" ON public.teams
  FOR DELETE USING (created_by = auth.uid());

-- ─── RLS: team_members ────────────────────────────────────────
DROP POLICY IF EXISTS "team_members_select" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete" ON public.team_members;

-- Membros do grupo podem ver quem mais está no grupo
CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm2
      WHERE tm2.team_id = team_id AND tm2.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id AND t.created_by = auth.uid()
    )
  );

-- Criador do grupo ou admin do grupo pode adicionar membros
CREATE POLICY "team_members_insert" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id AND t.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid() AND tm.role = 'admin'
    )
  );

-- Criador ou admin pode remover; membro pode se remover
CREATE POLICY "team_members_delete" ON public.team_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id AND t.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid() AND tm.role = 'admin'
    )
  );

-- ─── RLS: shared_repertories ──────────────────────────────────
DROP POLICY IF EXISTS "shared_rep_select" ON public.shared_repertories;
DROP POLICY IF EXISTS "shared_rep_insert" ON public.shared_repertories;
DROP POLICY IF EXISTS "shared_rep_delete" ON public.shared_repertories;

CREATE POLICY "shared_rep_select" ON public.shared_repertories
  FOR SELECT USING (
    shared_by = auth.uid()
    OR shared_with = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "shared_rep_insert" ON public.shared_repertories
  FOR INSERT WITH CHECK (
    shared_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.repertories r
      WHERE r.id = repertory_id AND r.created_by = auth.uid()
    )
  );

CREATE POLICY "shared_rep_delete" ON public.shared_repertories
  FOR DELETE USING (
    shared_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.repertories r
      WHERE r.id = repertory_id AND r.created_by = auth.uid()
    )
  );

-- ─── Corrige RLS de repertories: inclui acesso por grupo ──────
DROP POLICY IF EXISTS "repertories_select" ON public.repertories;

CREATE POLICY "repertories_select" ON public.repertories
  FOR SELECT USING (
    created_by = auth.uid()
    OR is_public = true
    OR public.is_at_least(3)
    OR EXISTS (
      SELECT 1 FROM public.shared_repertories sr
      WHERE sr.repertory_id = id
        AND (
          sr.shared_with = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = sr.team_id AND tm.user_id = auth.uid()
          )
        )
    )
  );

-- ─── Corrige RLS de repertory_items: espelha repertories ──────
DROP POLICY IF EXISTS "repertory_items_select" ON public.repertory_items;

CREATE POLICY "repertory_items_select" ON public.repertory_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.repertories r
      WHERE r.id = repertory_id
        AND (
          r.created_by = auth.uid()
          OR r.is_public = true
          OR public.is_at_least(3)
          OR EXISTS (
            SELECT 1 FROM public.shared_repertories sr
            WHERE sr.repertory_id = r.id
              AND (
                sr.shared_with = auth.uid()
                OR EXISTS (
                  SELECT 1 FROM public.team_members tm
                  WHERE tm.team_id = sr.team_id AND tm.user_id = auth.uid()
                )
              )
          )
        )
    )
  );

-- ─── users_select_own: todos autenticados podem ver outros (para busca de membros) ──
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() IS NOT NULL);
