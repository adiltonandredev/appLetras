-- ============================================================
-- 008_last_login_trigger.sql
-- Sincroniza auth.users.last_sign_in_at → public.users.last_login_at
-- ============================================================

-- ─── Função do trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_last_login()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualiza apenas quando last_sign_in_at realmente mudou
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.users
    SET last_login_at = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Trigger em auth.users ───────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;

CREATE TRIGGER on_auth_user_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_last_login();

-- ─── Popula valores já existentes (retroativo) ───────────────
UPDATE public.users pu
SET last_login_at = au.last_sign_in_at
FROM auth.users au
WHERE pu.id = au.id
  AND au.last_sign_in_at IS NOT NULL
  AND (pu.last_login_at IS NULL OR pu.last_login_at < au.last_sign_in_at);
