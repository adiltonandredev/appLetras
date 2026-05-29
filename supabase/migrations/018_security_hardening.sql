-- ============================================================
-- Migration 018 — Security Hardening
-- ============================================================

-- 1. Prevent multiple pending reports for the same song by same user
--    (allows re-reporting after previous was resolved/dismissed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_song_reports_one_pending_per_user
  ON song_reports (song_id, reported_by)
  WHERE status = 'pending';

-- 2. Ensure shared_repertories can only be removed by the person who created the share
--    Update RLS policy to enforce ownership on DELETE
DROP POLICY IF EXISTS "shared_repertories_delete" ON shared_repertories;
CREATE POLICY "shared_repertories_delete"
  ON shared_repertories FOR DELETE
  TO authenticated
  USING (shared_by = auth.uid());

-- 3. Enforce is_active at DB level — deactivated users cannot query protected tables
--    (belt-and-suspenders alongside app-level check)
CREATE OR REPLACE FUNCTION is_user_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM users WHERE id = auth.uid()),
    true  -- default true if no record yet (during registration)
  );
$$;

-- Add is_active check to key tables RLS
-- Songs: active users only
DROP POLICY IF EXISTS "songs_read_active_only" ON songs;
CREATE POLICY "songs_read_active_only"
  ON songs FOR SELECT
  TO authenticated
  USING (is_user_active());

-- Repertories: active users only
DROP POLICY IF EXISTS "repertories_read_active_only" ON repertories;
CREATE POLICY "repertories_read_active_only"
  ON repertories FOR SELECT
  TO authenticated
  USING (is_user_active());

-- 4. Rate-limit song_reports: max 10 pending reports per user total
CREATE OR REPLACE FUNCTION check_report_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pending_count integer;
BEGIN
  SELECT COUNT(*) INTO pending_count
  FROM song_reports
  WHERE reported_by = NEW.reported_by
    AND status = 'pending';

  IF pending_count >= 10 THEN
    RAISE EXCEPTION 'Limite de reportes pendentes atingido. Aguarde a resolução dos anteriores.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_report_rate_limit ON song_reports;
CREATE TRIGGER trg_report_rate_limit
  BEFORE INSERT ON song_reports
  FOR EACH ROW EXECUTE FUNCTION check_report_rate_limit();

-- Verify
SELECT 'Security hardening applied' AS status;
