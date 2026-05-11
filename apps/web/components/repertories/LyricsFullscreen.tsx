'use client';

import { useEffect, useState } from 'react';
import { X, Sun, Moon } from 'lucide-react';

interface Props {
  title: string;
  lyrics: string;
  onClose: () => void;
}

const SECTION_RE = /^\[(.+)\]$/;

type Block =
  | { type: 'chorus'; lines: string[] }
  | { type: 'verse' | 'bridge'; lines: string[] }
  | { type: 'blank' };

function parseLyrics(raw: string): Block[] {
  const lines = raw.split('\n');
  const blocks: Block[] = [];
  let currentType: 'verse' | 'chorus' | 'bridge' = 'verse';
  let currentLines: string[] = [];

  const flush = () => {
    if (currentLines.length) {
      blocks.push({ type: currentType, lines: [...currentLines] });
      currentLines = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const sectionMatch = trimmed.match(SECTION_RE);

    if (sectionMatch) {
      flush();
      const lower = sectionMatch[1].toLowerCase();
      if (lower.includes('refrão') || lower.includes('refrao')) {
        currentType = 'chorus';
      } else if (lower.includes('ponte') || lower.includes('bridge') || lower.includes('pré')) {
        currentType = 'bridge';
      } else {
        currentType = 'verse';
      }
      continue;
    }

    if (trimmed === '') {
      flush();
      // Adiciona separador apenas se não houver dois seguidos
      if (blocks.length && blocks[blocks.length - 1].type !== 'blank') {
        blocks.push({ type: 'blank' });
      }
      continue;
    }

    currentLines.push(line);
  }
  flush();

  // Remove blanks no início/fim
  while (blocks.length && blocks[0].type === 'blank') blocks.shift();
  while (blocks.length && blocks[blocks.length - 1].type === 'blank') blocks.pop();

  return blocks;
}

export function LyricsFullscreen({ title, lyrics, onClose }: Props) {
  const [dark, setDark] = useState(true);

  const bg    = dark ? '#0d0d0d' : '#fafaf8';
  const text  = dark ? '#f0f0f0' : '#1a1a1a';
  const muted = dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)';
  const sep   = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const btnBg = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const btnColor = dark ? 'white' : '#1a1a1a';

  // Bloqueia scroll do body
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

  const blocks = parseLyrics(lyrics);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: bg, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'background 0.2s' }}>

      {/* ── Barra superior ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: `1px solid ${sep}`, flexShrink: 0 }}>

        {/* Título */}
        <span style={{ flex: 1, color: muted, fontSize: 13, fontFamily: 'sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </span>

        {/* Toggle claro/escuro */}
        <button
          onClick={() => setDark(d => !d)}
          title={dark ? 'Fundo claro' : 'Fundo escuro'}
          style={{ background: btnBg, border: 'none', borderRadius: 8, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          {dark
            ? <Sun  style={{ width: 18, height: 18, color: '#facc15' }} />
            : <Moon style={{ width: 18, height: 18, color: '#4b5563' }} />
          }
        </button>

      </div>

      {/* ── Letra ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 20px 60px', WebkitOverflowScrolling: 'touch' as any }}>
        {blocks.map((block, i) => {
          if (block.type === 'blank') {
            return <div key={i} style={{ height: 16 }} />;
          }

          const isChorus = block.type === 'chorus';
          const isBridge = block.type === 'bridge';

          return (
            <div key={i} style={{
              marginBottom: 2,
              paddingLeft:  isChorus ? 12 : 0,
              borderLeft:   isChorus
                ? `3px solid ${dark ? '#C9A84C' : '#b5860d'}`
                : isBridge
                  ? `3px solid ${dark ? '#a78bfa' : '#7c3aed'}`
                  : 'none',
            }}>
              {block.lines.map((line, j) => (
                <p
                  key={j}
                  style={{
                    margin: 0,
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: 19,
                    lineHeight: 1.8,
                    color: isChorus
                      ? (dark ? '#f5e6a3' : '#7a5c00')
                      : isBridge
                        ? (dark ? '#c4b5fd' : '#5b21b6')
                        : text,
                    fontWeight: isChorus ? 700 : 400,
                    fontStyle: isBridge ? 'italic' : 'normal',
                    letterSpacing: '0.01em',
                  }}
                >
                  {line || ' '}
                </p>
              ))}
            </div>
          );
        })}
      </div>

      {/* ── Botão fechar fixo na base (mobile) ── */}
      <div style={{ padding: '12px 16px', flexShrink: 0, borderTop: `1px solid ${sep}` }}>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '13px',
            background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
            border: `1px solid ${sep}`,
            borderRadius: 12,
            cursor: 'pointer',
            color: btnColor,
            fontFamily: 'sans-serif',
            fontSize: 15,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <X style={{ width: 16, height: 16 }} />
          Fechar
        </button>
      </div>
    </div>
  );
}
