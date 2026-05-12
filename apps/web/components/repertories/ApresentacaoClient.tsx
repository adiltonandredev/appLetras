'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Music } from 'lucide-react';
import { clsx } from 'clsx';

interface Item {
  id: string;
  position: number;
  custom_key?: string;
  observations?: string;
  song: {
    id: string;
    title: string;
    author?: string;
    lyrics?: string;
    key_note?: string;
    media_urls?: string[];
    categories?: { name: string }[];
  };
}

interface Props {
  repertoryTitle: string;
  celebration?: string;
  items: Item[];
}

const SECTION_RE =
  /^\[(Refrão|Refrao|REFRÃO|Estrofe\s*\d*|Verso\s*\d*|Ponte|Pré-Refrão|Pre-Refrão|Coda|Intro|Final|Bridge)\]$/i;

function parseLyrics(lyrics: string) {
  if (!lyrics) return [];
  const lines = lyrics.split('\n');
  const blocks: { type: 'chorus' | 'verse' | 'bridge' | 'blank'; lines: string[] }[] = [];
  let current: { type: 'chorus' | 'verse' | 'bridge'; lines: string[] } | null = null;

  const flush = () => {
    if (current && current.lines.some(l => l.trim())) {
      blocks.push(current);
    }
    current = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (SECTION_RE.test(trimmed)) {
      flush();
      const lower = trimmed.slice(1, -1).toLowerCase();
      const type = lower.includes('refrão') || lower.includes('refrao')
        ? 'chorus'
        : lower.includes('ponte') || lower.includes('bridge') || lower.includes('pré') || lower.includes('pre')
        ? 'bridge'
        : 'verse';
      current = { type, lines: [] };
    } else if (!trimmed && !current) {
      // ignore blank before first block
    } else {
      if (!current) current = { type: 'verse', lines: [] };
      current.lines.push(line);
    }
  }
  flush();
  return blocks;
}

export function ApresentacaoClient({ repertoryTitle, celebration, items }: Props) {
  const [index, setIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const total = items.length;
  const current = items[index];
  const song = current?.song;
  const displayKey = current?.custom_key ?? song?.key_note;

  const prev = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex(i => Math.min(total - 1, i + 1)), [total]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
      if (e.key === 'Escape') window.history.back();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Touch swipe
  function onTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX);
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
    setTouchStart(null);
  }

  const blocks = parseLyrics(song?.lyrics ?? '');

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-brand-950 text-white select-none"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0">{celebration ? '🎵' : '🎶'}</span>
          <div className="min-w-0">
            <p className="text-xs text-white/50 truncate">{repertoryTitle}</p>
            <p className="text-sm font-semibold text-white/80 truncate">{song?.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {displayKey && (
            <span className="text-xs font-mono bg-white/10 text-gold-300 px-2 py-0.5 rounded-md">
              {displayKey}
            </span>
          )}
          <span className="text-xs text-white/40">
            {index + 1}/{total}
          </span>
          <button
            onClick={() => window.history.back()}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
        {/* Song title */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
            {song?.title}
          </h1>
          {song?.author && (
            <p className="text-white/40 text-sm mt-1">{song.author}</p>
          )}
          {current?.observations && (
            <p className="text-amber-300 text-sm mt-2 font-medium">⚡ {current.observations}</p>
          )}
        </div>

        {/* Lyrics */}
        {blocks.length > 0 ? (
          <div className="max-w-2xl mx-auto space-y-5">
            {blocks.map((block, i) => (
              <div
                key={i}
                className={clsx(
                  'rounded-xl px-5 py-4',
                  block.type === 'chorus' && 'bg-gold-400/15 border-l-4 border-gold-400',
                  block.type === 'bridge' && 'bg-purple-500/15 border-l-4 border-purple-400',
                  block.type === 'verse' && 'bg-white/5',
                )}
              >
                {block.lines.map((line, j) => (
                  <p
                    key={j}
                    className={clsx(
                      'leading-relaxed text-base sm:text-lg',
                      block.type === 'chorus' && 'text-gold-100 font-semibold',
                      block.type === 'bridge' && 'text-purple-200 italic',
                      block.type === 'verse' && 'text-white/85',
                      !line.trim() && 'h-3',
                    )}
                  >
                    {line || ' '}
                  </p>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-white/30">
            <Music className="w-12 h-12 mb-2" />
            <p className="text-sm">Letra não cadastrada</p>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="shrink-0 border-t border-white/10 px-4 py-3 flex items-center justify-between gap-4">
        {/* Prev */}
        <button
          onClick={prev}
          disabled={index === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:inline">Anterior</span>
        </button>

        {/* Song dots */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-xs">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={clsx(
                'w-2 h-2 rounded-full shrink-0 transition-all',
                i === index ? 'bg-gold-400 w-5' : 'bg-white/25 hover:bg-white/50'
              )}
            />
          ))}
        </div>

        {/* Next */}
        <button
          onClick={next}
          disabled={index === total - 1}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <span className="text-sm font-medium hidden sm:inline">Próxima</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
