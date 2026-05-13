-- ============================================================
-- 013_rpc_group_helpers.sql
-- Funções RPC auxiliares para operações de grupo
-- (SECURITY DEFINER evita problemas de RLS recursivo)
-- ============================================================

-- ─── search_user_by_email ────────────────────────────────────
-- Qualquer usuário autenticado pode buscar outro por e-mail.
-- Usa SECURITY DEFINER para contornar limitações de RLS na tabela users.
CREATE OR REPLACE FUNCTION public.search_user_by_email(p_email TEXT)
RETURNS TABLE(id UUID, full_name TEXT, email TEXT, avatar_url TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT u.id, u.full_name, u.email, u.avatar_url
  FROM public.users u
  WHERE u.email ILIKE p_email
  LIMIT 1;
$$;

REVOKE ALL  ON FUNCTION public.search_user_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_user_by_email(TEXT) TO authenticated;

-- ─── add_team_member ─────────────────────────────────────────
-- Insere um membro no grupo após verificar se o chamador é
-- o criador ou um admin. SECURITY DEFINER contorna recursão
-- de RLS que ocorria no INSERT de team_members.
CREATE OR REPLACE FUNCTION public.add_team_member(
  p_team_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_creator UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Verifica se o grupo existe e busca o criador
  SELECT created_by INTO v_creator
  FROM public.teams
  WHERE id = p_team_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Grupo não encontrado.';
  END IF;

  -- Verifica se o chamador é o criador ou um admin do grupo
  IF v_creator IS DISTINCT FROM auth.uid() THEN
    SELECT EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = p_team_id
        AND user_id = auth.uid()
        AND role = 'admin'
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Sem permissão para adicionar membros a este grupo.';
    END IF;
  END IF;

  -- Verifica se o usuário a adicionar existe
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  -- Insere (ignora se já for membro)
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (p_team_id, p_user_id, 'member')
  ON CONFLICT (team_id, user_id) DO NOTHING;
END;
$$;

REVOKE ALL  ON FUNCTION public.add_team_member(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_team_member(UUID, UUID) TO authenticated;

-- ─── Backfill: adiciona criadores existentes como membros admin ─
-- Garante que grupos criados antes desta migration também tenham
-- o criador em team_members (necessário para queries de compartilhamento).
INSERT INTO public.team_members (team_id, user_id, role)
SELECT t.id, t.created_by, 'admin'
FROM public.teams t
WHERE t.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = t.id AND tm.user_id = t.created_by
  )
ON CONFLICT (team_id, user_id) DO NOTHING;
