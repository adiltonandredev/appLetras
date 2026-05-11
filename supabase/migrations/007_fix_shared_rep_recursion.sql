-- ============================================================
-- 007_fix_shared_rep_recursion.sql
-- Corrige recursão infinita nas políticas de shared_repertories
--
-- Ciclo detectado:
--   shared_rep_insert → checa repertories (SELECT)
--   → repertories_select → checa shared_repertories (SELECT)
--   → shared_rep_select (ativa RLS de shared_repertories
--     enquanto já está avaliando a policy dela) → RECURSÃO
-- ============================================================

-- ─── Função auxiliar: verifica acesso a shared_rep via grupo ─
-- SECURITY DEFINER: acessa team_members sem RLS, evitando ciclos
CREATE OR REPLACE FUNCTION public.user_is_in_shared_team(
  p_team_id  UUID,
  p_user_id  UUID
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

REVOKE ALL ON FUNCTION public.user_is_in_shared_team(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_in_shared_team(UUID, UUID) TO authenticated;

-- ─── shared_rep_select: usa helper em vez de subquery direta ─
DROP POLICY IF EXISTS "shared_rep_select" ON public.shared_repertories;

CREATE POLICY "shared_rep_select" ON public.shared_repertories
  FOR SELECT USING (
    shared_by = auth.uid()
    OR shared_with = auth.uid()
    OR (team_id IS NOT NULL AND public.user_is_in_shared_team(team_id, auth.uid()))
  );

-- ─── shared_rep_insert: apenas shared_by para evitar o ciclo ─
-- (shared_by já é preenchido como auth.uid() no frontend)
DROP POLICY IF EXISTS "shared_rep_insert" ON public.shared_repertories;

CREATE POLICY "shared_rep_insert" ON public.shared_repertories
  FOR INSERT WITH CHECK (shared_by = auth.uid());

-- ─── shared_rep_delete: idem, simplificado ───────────────────
DROP POLICY IF EXISTS "shared_rep_delete" ON public.shared_repertories;

CREATE POLICY "shared_rep_delete" ON public.shared_repertories
  FOR DELETE USING (shared_by = auth.uid());

-- ─── repertories_select: usa helpers para evitar subconsultas ─
-- Substitui os EXISTS aninhados que percorriam shared_repertories
-- e team_members com potencial de recursão cruzada
DROP POLICY IF EXISTS "repertories_select" ON public.repertories;

CREATE OR REPLACE FUNCTION public.user_can_view_repertory(
  p_repertory_id UUID,
  p_user_id      UUID
)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shared_repertories sr
    WHERE sr.repertory_id = p_repertory_id
      AND (
        sr.shared_with = p_user_id
        OR (sr.team_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.team_members tm
          WHERE tm.team_id = sr.team_id AND tm.user_id = p_user_id
        ))
      )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

REVOKE ALL ON FUNCTION public.user_can_view_repertory(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_view_repertory(UUID, UUID) TO authenticated;

CREATE POLICY "repertories_select" ON public.repertories
  FOR SELECT USING (
    created_by = auth.uid()
    OR is_public = true
    OR public.is_at_least(3)
    OR public.user_can_view_repertory(id, auth.uid())
  );

-- ─── repertory_items_select: usa o mesmo helper ──────────────
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
          OR public.user_can_view_repertory(r.id, auth.uid())
        )
    )
  );
