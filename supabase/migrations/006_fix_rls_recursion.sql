-- ============================================================
-- 006_fix_rls_recursion.sql
-- Corrige recursão infinita nas políticas RLS de team_members
-- ============================================================

-- ─── Função auxiliar (SECURITY DEFINER) ─────────────────────
-- Executa como owner da função, ignorando RLS — permite checar
-- membership sem acionar a própria policy de team_members.
CREATE OR REPLACE FUNCTION public.user_is_team_member(
  p_team_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Garante que apenas usuários autenticados podem chamar a função
REVOKE ALL ON FUNCTION public.user_is_team_member(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_team_member(UUID, UUID) TO authenticated;

-- ─── Corrige team_members_select ────────────────────────────
-- Remove a auto-referência que causava a recursão infinita
DROP POLICY IF EXISTS "team_members_select" ON public.team_members;

CREATE POLICY "team_members_select" ON public.team_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.user_is_team_member(team_id, auth.uid())
  );

-- ─── Corrige teams_select ────────────────────────────────────
-- Usa a função para checar membership em vez de subquery direta
DROP POLICY IF EXISTS "teams_select" ON public.teams;

CREATE POLICY "teams_select" ON public.teams
  FOR SELECT USING (
    created_by = auth.uid()
    OR public.user_is_team_member(id, auth.uid())
  );

-- ─── Corrige teams_update ────────────────────────────────────
DROP POLICY IF EXISTS "teams_update" ON public.teams;

CREATE POLICY "teams_update" ON public.teams
  FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    )
  );

-- ─── Corrige team_members_insert ─────────────────────────────
-- Criador do grupo ou admin (via função, sem recursão) pode adicionar
DROP POLICY IF EXISTS "team_members_insert" ON public.team_members;

CREATE POLICY "team_members_insert" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id AND t.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    )
  );

-- ─── Corrige team_members_delete ─────────────────────────────
DROP POLICY IF EXISTS "team_members_delete" ON public.team_members;

CREATE POLICY "team_members_delete" ON public.team_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_id AND t.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    )
  );
