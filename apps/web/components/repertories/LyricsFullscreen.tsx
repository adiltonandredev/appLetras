'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  lyrics: string;
  onClose: () => void;
}

export function LyricsFullscreen({ title, lyrics, onClose }: Props) {
  // Bloqueia scroll do body enquanto o modal está aberto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Fecha com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Remove marcadores de seção e formata o texto
  const cleanLyrics = lyrics
    .split('\n')
    .filter(line => !/^\[.+\]$/.test(line.trim()))   // remove [Refrão], [Estrofe 1] etc.
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')                       // máximo 2 linhas em branco
    .trim();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Barra superior */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13,
            fontFamily: 'sans-serif',
            maxWidth: 'calc(100% - 44px)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </span>

        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '50%',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X style={{ width: 18, height: 18, color: 'white' }} />
        </button>
      </div>

      {/* Letra — área rolável */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 20px 40px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 18,
            lineHeight: 1.85,
            color: '#f5f5f5',
            margin: 0,
            letterSpacing: '0.01em',
          }}
        >
          {cleanLyrics}
        </pre>
      </div>
    </div>
  );
}
