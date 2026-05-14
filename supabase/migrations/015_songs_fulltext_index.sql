-- Migration 015: Índice de texto completo para busca em letras de músicas
-- Cria um índice GIN sobre um tsvector combinando título, autor e letra.
-- Isso torna a busca por trecho de letra rápida mesmo com milhares de músicas.

-- Índice GIN para busca full-text (PostgreSQL)
CREATE INDEX IF NOT EXISTS songs_fulltext_idx
  ON public.songs
  USING gin (
    to_tsvector(
      'portuguese',
      coalesce(title,  '') || ' ' ||
      coalesce(author, '') || ' ' ||
      coalesce(lyrics, '')
    )
  );

-- Índice trigram para busca por ilike (necessário para o .or() do Supabase)
-- Requer a extensão pg_trgm (já disponível no Supabase)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS songs_title_trgm_idx  ON public.songs USING gin (title  gin_trgm_ops);
CREATE INDEX IF NOT EXISTS songs_author_trgm_idx ON public.songs USING gin (author gin_trgm_ops);
CREATE INDEX IF NOT EXISTS songs_lyrics_trgm_idx ON public.songs USING gin (lyrics gin_trgm_ops);
