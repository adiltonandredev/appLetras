-- =============================================================
-- Migration 016: Corrige e reaplica o sistema de auditoria
-- Cole este SQL completo no Supabase Dashboard → SQL Editor
-- =============================================================

-- ─── 1. Garante que a tabela existe ──────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_user   ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_date   ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action);

-- ─── 2. Ativa RLS e recria políticas ─────────────────────────
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;

-- Somente admins (nível ≥ 4) lêem
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (public.is_at_least(4));

-- Triggers e service role inserem livremente
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- ─── 3. Função auxiliar: user_id do JWT ──────────────────────
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─── 4. Trigger: SONGS ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_songs_fn()
RETURNS TRIGGER AS $$
DECLARE v_user uuid := public.current_user_id();
BEGIN
  IF v_user IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_value)
    VALUES (v_user, 'song_created', 'song', NEW.id::text,
      jsonb_build_object('title', NEW.title, 'status', NEW.status));

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
      VALUES (v_user, 'song_status_changed', 'song', NEW.id::text,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('title', NEW.title, 'status', NEW.status));
    ELSE
      INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
      VALUES (v_user, 'song_updated', 'song', NEW.id::text,
        jsonb_build_object('title', OLD.title),
        jsonb_build_object('title', NEW.title));
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value)
    VALUES (v_user, 'song_deleted', 'song', OLD.id::text,
      jsonb_build_object('title', OLD.title));
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_songs ON public.songs;
CREATE TRIGGER trg_audit_songs
  AFTER INSERT OR UPDATE OR DELETE ON public.songs
  FOR EACH ROW EXECUTE FUNCTION public.audit_songs_fn();

-- ─── 5. Trigger: SONG APPROVALS ──────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_song_approvals_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_user       uuid := public.current_user_id();
  v_song_title text;
BEGIN
  IF v_user IS NULL THEN RETURN NEW; END IF;
  SELECT title INTO v_song_title FROM public.songs WHERE id = NEW.song_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_value)
    VALUES (v_user, 'song_submitted', 'song', NEW.song_id::text,
      jsonb_build_object('title', v_song_title, 'approval_id', NEW.id));

  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (
      COALESCE(NEW.reviewer_id, v_user),
      CASE NEW.status
        WHEN 'approved'           THEN 'song_approved'
        WHEN 'rejected'           THEN 'song_rejected'
        WHEN 'revision_requested' THEN 'song_revision_requested'
        ELSE 'song_approval_updated'
      END,
      'song', NEW.song_id::text,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('title', v_song_title, 'status', NEW.status, 'comment', NEW.comment)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_song_approvals ON public.song_approvals;
CREATE TRIGGER trg_audit_song_approvals
  AFTER INSERT OR UPDATE ON public.song_approvals
  FOR EACH ROW EXECUTE FUNCTION public.audit_song_approvals_fn();

-- ─── 6. Trigger: REPERTORIES ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_repertories_fn()
RETURNS TRIGGER AS $$
DECLARE v_user uuid := public.current_user_id();
BEGIN
  IF v_user IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_value)
    VALUES (v_user, 'repertory_created', 'repertory', NEW.id::text,
      jsonb_build_object('title', NEW.title));

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (v_user, 'repertory_updated', 'repertory', NEW.id::text,
      jsonb_build_object('title', OLD.title),
      jsonb_build_object('title', NEW.title));

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value)
    VALUES (v_user, 'repertory_deleted', 'repertory', OLD.id::text,
      jsonb_build_object('title', OLD.title));
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_repertories ON public.repertories;
CREATE TRIGGER trg_audit_repertories
  AFTER INSERT OR UPDATE OR DELETE ON public.repertories
  FOR EACH ROW EXECUTE FUNCTION public.audit_repertories_fn();

-- ─── 7. Trigger: ROLE ASSIGNMENTS ────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_role_assignments_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_user        uuid := public.current_user_id();
  v_target_name text;
  v_old_role    text;
  v_new_role    text;
BEGIN
  IF v_user IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT full_name INTO v_target_name FROM public.users WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  IF TG_OP = 'INSERT' THEN
    SELECT name INTO v_new_role FROM public.roles WHERE id = NEW.role_id;
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_value)
    VALUES (v_user, 'role_assigned', 'user', NEW.user_id::text,
      jsonb_build_object('user_name', v_target_name, 'role', v_new_role));

  ELSIF TG_OP = 'UPDATE' AND OLD.role_id IS DISTINCT FROM NEW.role_id THEN
    SELECT name INTO v_old_role FROM public.roles WHERE id = OLD.role_id;
    SELECT name INTO v_new_role FROM public.roles WHERE id = NEW.role_id;
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (v_user, 'role_changed', 'user', NEW.user_id::text,
      jsonb_build_object('user_name', v_target_name, 'role', v_old_role),
      jsonb_build_object('user_name', v_target_name, 'role', v_new_role));

  ELSIF TG_OP = 'DELETE' THEN
    SELECT name INTO v_old_role FROM public.roles WHERE id = OLD.role_id;
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value)
    VALUES (v_user, 'role_removed', 'user', OLD.user_id::text,
      jsonb_build_object('user_name', v_target_name, 'role', v_old_role));
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_role_assignments ON public.user_role_assignments;
CREATE TRIGGER trg_audit_role_assignments
  AFTER INSERT OR UPDATE OR DELETE ON public.user_role_assignments
  FOR EACH ROW EXECUTE FUNCTION public.audit_role_assignments_fn();

-- ─── 8. Trigger: USERS (ativação/desativação) ────────────────
CREATE OR REPLACE FUNCTION public.audit_users_fn()
RETURNS TRIGGER AS $$
DECLARE v_user uuid := public.current_user_id();
BEGIN
  IF v_user IS NULL THEN RETURN NEW; END IF;
  IF OLD.is_active IS NOT DISTINCT FROM NEW.is_active THEN RETURN NEW; END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (
    v_user,
    CASE WHEN NEW.is_active THEN 'user_activated' ELSE 'user_deactivated' END,
    'user', NEW.id::text,
    jsonb_build_object('is_active', OLD.is_active, 'name', OLD.full_name),
    jsonb_build_object('is_active', NEW.is_active, 'name', NEW.full_name)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_users ON public.users;
CREATE TRIGGER trg_audit_users
  AFTER UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.audit_users_fn();

-- ─── 9. Trigger: GRUPOS (criação/exclusão) ───────────────────
CREATE OR REPLACE FUNCTION public.audit_teams_fn()
RETURNS TRIGGER AS $$
DECLARE v_user uuid := public.current_user_id();
BEGIN
  IF v_user IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_value)
    VALUES (v_user, 'group_created', 'group', NEW.id::text,
      jsonb_build_object('name', NEW.name));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value)
    VALUES (v_user, 'group_deleted', 'group', OLD.id::text,
      jsonb_build_object('name', OLD.name));
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_teams ON public.teams;
CREATE TRIGGER trg_audit_teams
  AFTER INSERT OR DELETE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.audit_teams_fn();

-- ─── 10. Verifica instalação ──────────────────────────────────
SELECT
  trigger_name,
  event_object_table,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'trg_audit_%'
ORDER BY event_object_table;
