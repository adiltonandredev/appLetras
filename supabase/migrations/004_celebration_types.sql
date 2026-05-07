-- ============================================================
-- 004_celebration_types.sql
-- Tabela dinâmica de tipos de celebração
-- ============================================================

-- 1. Cria a tabela
CREATE TABLE IF NOT EXISTS public.celebration_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT NOT NULL DEFAULT '🎵',
  sort_order  INT  NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Seed com os tipos já existentes (idempotente)
INSERT INTO public.celebration_types (name, slug, icon, sort_order) VALUES
  ('Missa',            'missa',         '⛪', 1),
  ('Adoração',         'adoracao',      '🙌', 2),
  ('Grupo de Oração',  'grupo_oracao',  '🙏', 3),
  ('Encontro',         'encontro',      '👥', 4),
  ('Outro',            'outro',         '📋', 5)
ON CONFLICT (slug) DO NOTHING;

-- 3. Remove o CHECK constraint antigo e libera texto livre na coluna celebration
ALTER TABLE public.repertories
  DROP CONSTRAINT IF EXISTS repertories_celebration_check;

-- 4. RLS — leitura pública, escrita apenas para admins/coordenadores
ALTER TABLE public.celebration_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "celebration_types_read_all"
  ON public.celebration_types FOR SELECT
  USING (true);

CREATE POLICY "celebration_types_write_admin"
  ON public.celebration_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments ura
      JOIN public.roles r ON r.id = ura.role_id
      WHERE ura.user_id = auth.uid()
        AND r.level >= 70
    )
  );

-- 5. Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS celebration_types_updated_at ON public.celebration_types;
CREATE TRIGGER celebration_types_updated_at
  BEFORE UPDATE ON public.celebration_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
