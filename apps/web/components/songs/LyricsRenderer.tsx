'use client';

import { clsx } from 'clsx';

interface LyricsRendererProps {
  lyrics: string;
  className?: string;
}

const SECTION_REGEX = /^\[(Refrão|Refrao|REFRÃO|REFRAO|Estrofe\s*\d*|ESTROFE\s*\d*|Verso\s*\d*|VERSO\s*\d*|Ponte|PONTE|Pré-Refrão|Pré-refrão|Pre-Refrão|Pre-refrão|PRÉ-REFRÃO|Coda|CODA|Intro|INTRO|Final|FINAL|Bridge|BRIDGE)\]$/i;

function getSectionType(header: string): 'chorus' | 'bridge' | 'verse' {
  const lower = header.toLowerCase();
  if (lower.includes('refrão') || lower.includes('refrao')) return 'chorus';
  if (lower.includes('ponte') || lower.includes('bridge') || lower.includes('pré') || lower.includes('pre')) return 'bridge';
  return 'verse';
}

interface LyricsBlock {
  header: string | null;
  type: 'chorus' | 'bridge' | 'verse' | 'none';
  lines: string[];
}

function parseLyrics(lyrics: string): LyricsBlock[] {
  const rawLines = lyrics.split('\n');
  const blocks: LyricsBlock[] = [];
  let currentBlock: LyricsBlock = { header: null, type: 'none', lines: [] };

  for (const line of rawLines) {
    const trimmed = line.trim();
    const match = SECTION_REGEX.test(trimmed);

    if (match) {
      if (currentBlock.lines.length > 0 || currentBlock.header) {
        blocks.push(currentBlock);
      }
      const inner = trimmed.slice(1, -1); // remove [ ]
      currentBlock = {
        header: inner,
        type: getSectionType(inner),
        lines: [],
      };
    } else {
      currentBlock.lines.push(line);
    }
  }

  if (currentBlock.lines.length > 0 || currentBlock.header) {
    blocks.push(currentBlock);
  }

  return blocks;
}

export function LyricsRenderer({ lyrics, className }: LyricsRendererProps) {
  if (\!lyrics) return null;

  const blocks = parseLyrics(lyrics);
  const hasMarkers = blocks.some(b => b.header \!== null);

  // If no markers, just render as plain pre
  if (\!hasMarkers) {
    return (
      <pre className={clsx('text-gray-700 whitespace-pre-wrap font-sans text-base leading-relaxed', className)}>
        {lyrics}
      </pre>
    );
  }

  return (
    <div className={clsx('space-y-4', className)}>
      {blocks.map((block, i) => {
        const isChorus = block.type === 'chorus';
        const isBridge = block.type === 'bridge';
        const content = block.lines.join('\n').trim();

        return (
          <div key={i}>
            {block.header && (
              <div className={clsx(
                'inline-flex items-center gap-1.5 mb-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider',
                isChorus && 'bg-gold-400/20 text-gold-600 border border-gold-400/40',
                isBridge && 'bg-purple-100 text-purple-600 border border-purple-200',
                \!isChorus && \!isBridge && 'bg-gray-100 text-gray-500 border border-gray-200',
              )}>
                {isChorus && <span>♪</span>}
                {block.header}
              </div>
            )}
            {content && (
              <pre className={clsx(
                'whitespace-pre-wrap font-sans leading-relaxed text-base',
                isChorus && 'font-bold text-gray-900',
                isBridge && 'italic text-gray-700',
                \!isChorus && \!isBridge && 'text-gray-700',
                isChorus && 'pl-3 border-l-2 border-gold-400',
              )}>
                {content}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}
