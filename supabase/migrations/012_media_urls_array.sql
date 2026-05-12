-- =============================================================
-- Migration 012: Converte media_url (texto) para media_urls (array)
-- =============================================================

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';

-- Migra dado existente (se houver)
UPDATE public.songs
  SET media_urls = ARRAY[media_url]
  WHERE media_url IS NOT NULL AND media_url != '';

ALTER TABLE public.songs
  DROP COLUMN IF EXISTS media_url;
