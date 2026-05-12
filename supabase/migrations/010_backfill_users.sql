-- =============================================================
-- Migration 010: Backfill public.users from auth.users
-- Garante que todos os usuários do auth existam em public.users
-- =============================================================

-- Insere usuários do auth que não existem em public.users
INSERT INTO public.users (id, email, full_name, avatar_url, created_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  au.raw_user_meta_data->>'avatar_url',
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
);

-- Atribui perfil padrão para quem não tem perfil atribuído
INSERT INTO public.user_role_assignments (user_id, role_id)
SELECT
  pu.id,
  r.id
FROM public.users pu
CROSS JOIN (SELECT id FROM public.roles WHERE name = 'padrao' LIMIT 1) r
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_role_assignments ura WHERE ura.user_id = pu.id
);
