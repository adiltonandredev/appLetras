-- =============================================================
-- Migration 009: Audit Log Triggers
-- Registra automaticamente as ações mais importantes no sistema
-- =============================================================

-- Helper: retorna o user_id atual da sessão JWT (null se service role)
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =============================================================
-- SONGS
-- =============================================================
CREATE OR REPLACE FUNCTION public.audit_songs_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_user uuid := public.current_user_id();
BEGIN
  IF v_user IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_value)
    VALUES (
      v_user, 'song_created', 'song', NEW.id,
      jsonb_build_object('title', NEW.title, 'status', NEW.status)
    );

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
      VALUES (
        v_user, 'song_status_changed', 'song', NEW.id,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('title', NEW.title, 'status', NEW.status)
      );
    ELSE
      INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
      VALUES (
        v_user, 'song_updated', 'song', NEW.id,
        jsonb_build_object('title', OLD.title),
        jsonb_build_object('title', NEW.title)
      );
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value)
    VALUES (
      v_user, 'song_deleted', 'song', OLD.id,
      jsonb_build_object('title', OLD.title)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_songs ON public.songs;
CREATE TRIGGER trg_audit_songs
  AFTER INSERT OR UPDATE OR DELETE ON public.songs
  FOR EACH ROW EXECUTE FUNCTION public.audit_songs_fn();


-- =============================================================
-- SONG APPROVALS (aprovação / rejeição / revisão)
-- =============================================================
CREATE OR REPLACE FUNCTION public.audit_song_approvals_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_user uuid := public.current_user_id();
  v_song_title text;
BEGIN
  IF v_user IS NULL THEN RETURN NEW; END IF;

  SELECT title INTO v_song_title FROM public.songs WHERE id = NEW.song_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_value)
    VALUES (
      v_user, 'song_submitted', 'song', NEW.song_id,
      jsonb_build_object('title', v_song_title, 'approval_id', NEW.id)
    );

  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (
      COALESCE(NEW.reviewer_id, v_user),
      CASE NEW.status
        WHEN 'approved'          THEN 'song_approved'
        WHEN 'rejected'          THEN 'song_rejected'
        WHEN 'revision_requested' THEN 'song_revision_requested'
        ELSE 'song_approval_updated'
      END,
      'song', NEW.song_id,
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


-- =============================================================
-- REPERTORIES
-- =============================================================
CREATE OR REPLACE FUNCTION public.audit_repertories_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_user uuid := public.current_user_id();
BEGIN
  IF v_user IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_value)
    VALUES (
      v_user, 'repertory_created', 'repertory', NEW.id,
      jsonb_build_object('title', NEW.title)
    );

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (
      v_user, 'repertory_updated', 'repertory', NEW.id,
      jsonb_build_object('title', OLD.title),
      jsonb_build_object('title', NEW.title)
    );

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value)
    VALUES (
      v_user, 'repertory_deleted', 'repertory', OLD.id,
      jsonb_build_object('title', OLD.title)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_repertories ON public.repertories;
CREATE TRIGGER trg_audit_repertories
  AFTER INSERT OR UPDATE OR DELETE ON public.repertories
  FOR EACH ROW EXECUTE FUNCTION public.audit_repertories_fn();


-- =============================================================
-- USER ROLE ASSIGNMENTS (mudança de perfil)
-- =============================================================
CREATE OR REPLACE FUNCTION public.audit_role_assignments_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_user   uuid := public.current_user_id();
  v_target_name text;
  v_old_role text;
  v_new_role text;
BEGIN
  IF v_user IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT full_name INTO v_target_name FROM public.users WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  IF TG_OP = 'INSERT' THEN
    SELECT name INTO v_new_role FROM public.roles WHERE id = NEW.role_id;
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_value)
    VALUES (
      v_user, 'role_assigned', 'user', NEW.user_id,
      jsonb_build_object('user_name', v_target_name, 'role', v_new_role)
    );

  ELSIF TG_OP = 'UPDATE' AND OLD.role_id IS DISTINCT FROM NEW.role_id THEN
    SELECT name INTO v_old_role FROM public.roles WHERE id = OLD.role_id;
    SELECT name INTO v_new_role FROM public.roles WHERE id = NEW.role_id;
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (
      v_user, 'role_changed', 'user', NEW.user_id,
      jsonb_build_object('user_name', v_target_name, 'role', v_old_role),
      jsonb_build_object('user_name', v_target_name, 'role', v_new_role)
    );

  ELSIF TG_OP = 'DELETE' THEN
    SELECT name INTO v_old_role FROM public.roles WHERE id = OLD.role_id;
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value)
    VALUES (
      v_user, 'role_removed', 'user', OLD.user_id,
      jsonb_build_object('user_name', v_target_name, 'role', v_old_role)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_role_assignments ON public.user_role_assignments;
CREATE TRIGGER trg_audit_role_assignments
  AFTER INSERT OR UPDATE OR DELETE ON public.user_role_assignments
  FOR EACH ROW EXECUTE FUNCTION public.audit_role_assignments_fn();


-- =============================================================
-- USERS (ativação / desativação)
-- =============================================================
CREATE OR REPLACE FUNCTION public.audit_users_fn()
RETURNS TRIGGER AS $$
DECLARE
  v_user uuid := public.current_user_id();
BEGIN
  IF v_user IS NULL THEN RETURN NEW; END IF;
  IF OLD.is_active IS NOT DISTINCT FROM NEW.is_active THEN RETURN NEW; END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (
    v_user,
    CASE WHEN NEW.is_active THEN 'user_activated' ELSE 'user_deactivated' END,
    'user', NEW.id,
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
