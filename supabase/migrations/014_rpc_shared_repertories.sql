-- ============================================================
-- 014_rpc_shared_repertories.sql
-- Função RPC para buscar IDs de repertórios compartilhados
-- (SECURITY DEFINER — acessa shared_repertories e team_members
--  sem RLS, evitando ciclos e falhas silenciosas no cliente)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_shared_repertory_ids(p_user_id UUID)
RETURNS TABLE(repertory_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH
  -- grupos dos quais o usuário faz parte
  user_teams AS (
    SELECT team_id
    FROM public.team_members
    WHERE user_id = p_user_id
  ),
  -- repertórios compartilhados diretamente OU via grupo
  all_shares AS (
    SELECT sr.repertory_id
    FROM public.shared_repertories sr
    WHERE sr.repertory_id IS NOT NULL
      AND (
        sr.shared_with = p_user_id
        OR sr.team_id IN (SELECT team_id FROM user_teams)
      )
  )
  SELECT DISTINCT repertory_id FROM all_shares;
$$;

REVOKE ALL   ON FUNCTION public.get_shared_repertory_ids(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_repertory_ids(UUID) TO authenticated;
