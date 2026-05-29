-- ============================================================
-- Migration 017 — Song Reports (reportar erro em música)
-- ============================================================

CREATE TABLE IF NOT EXISTS song_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id      uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  reported_by  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason       text NOT NULL,           -- 'wrong_lyrics' | 'wrong_info' | 'duplicate' | 'copyright' | 'other'
  description  text NOT NULL,
  status       text NOT NULL DEFAULT 'pending',  -- 'pending' | 'resolved' | 'dismissed'
  admin_note   text,
  resolved_by  uuid REFERENCES users(id),
  resolved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_song_reports_song_id   ON song_reports(song_id);
CREATE INDEX IF NOT EXISTS idx_song_reports_status    ON song_reports(status);
CREATE INDEX IF NOT EXISTS idx_song_reports_created   ON song_reports(created_at DESC);

-- RLS
ALTER TABLE song_reports ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode criar um reporte
CREATE POLICY "song_reports_insert"
  ON song_reports FOR INSERT
  TO authenticated
  WITH CHECK (reported_by = auth.uid());

-- Usuário vê apenas os próprios reportes
CREATE POLICY "song_reports_select_own"
  ON song_reports FOR SELECT
  TO authenticated
  USING (reported_by = auth.uid());

-- Admin vê todos (via service role ou usando função)
CREATE POLICY "song_reports_select_admin"
  ON song_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN roles r ON r.id = ura.role_id
      WHERE ura.user_id = auth.uid()
        AND r.name = 'administrador'
    )
  );

-- Admin pode atualizar (resolver/descartar)
CREATE POLICY "song_reports_update_admin"
  ON song_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN roles r ON r.id = ura.role_id
      WHERE ura.user_id = auth.uid()
        AND r.name = 'administrador'
    )
  );

-- Verifica
SELECT COUNT(*) AS policies_ok FROM pg_policies WHERE tablename = 'song_reports';
