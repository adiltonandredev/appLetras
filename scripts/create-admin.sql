-- ============================================================
-- create-admin.sql
-- Promove um usuário existente para Administrador
--
-- Como usar no Supabase Dashboard → SQL Editor:
--   1. Substitua 'email@exemplo.com' pelo e-mail do usuário
--   2. Execute o script
-- ============================================================

DO $$
DECLARE
  v_user_id   UUID;
  v_role_id   UUID;
  v_user_name TEXT;
BEGIN
  -- Buscar usuário pelo e-mail
  SELECT id, full_name INTO v_user_id, v_user_name
  FROM public.users
  WHERE email = 'email@exemplo.com';  -- ← SUBSTITUA AQUI

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado. Ele precisa ter feito login ao menos uma vez.';
  END IF;

  -- Buscar role administrador
  SELECT id INTO v_role_id
  FROM public.roles
  WHERE name = 'administrador';

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role "administrador" não encontrado. Execute o seed.sql primeiro.';
  END IF;

  -- Atribuir role
  INSERT INTO public.user_role_assignments (user_id, role_id)
  VALUES (v_user_id, v_role_id)
  ON CONFLICT (user_id) DO UPDATE SET role_id = EXCLUDED.role_id;

  RAISE NOTICE 'Usuário "%" (%) promovido a Administrador com sucesso.', v_user_name, v_user_id;
END $$;

-- Verificar resultado
SELECT
  u.full_name,
  u.email,
  r.name AS role,
  r.level
FROM public.users u
JOIN public.user_role_assignments ura ON ura.user_id = u.id
JOIN public.roles r ON r.id = ura.role_id
WHERE u.email = 'email@exemplo.com';  -- ← SUBSTITUA AQUI
