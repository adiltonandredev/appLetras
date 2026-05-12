-- =============================================================
-- Migration 011: Adiciona media_url e remove campos não usados
-- =============================================================

-- Adiciona coluna media_url para links do YouTube / plataformas
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS media_url TEXT;

-- Remove campos não utilizados
ALTER TABLE public.songs
  DROP COLUMN IF EXISTS subtitle,
  DROP COLUMN IF EXISTS composer,
  DROP COLUMN IF EXISTS bpm;
