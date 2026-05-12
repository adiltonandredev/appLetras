'use client';

import { clsx } from 'clsx';

interface LyricsRendererProps {
  lyrics: string;
  className?: string;
  fontSize?: number;
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

export function LyricsRenderer({ lyrics, className, fontSize }: LyricsRendererProps) {
  if (!lyrics) return null;

  const fontStyle = fontSize ? { fontSize: `${fontSize}px`, lineHeight: 1.7 } : undefined;

  const blocks = parseLyrics(lyrics);
  const hasMarkers = blocks.some(b => b.header !== null);

  // If no markers, just render as plain pre
  if (!hasMarkers) {
    return (
      <pre
        className={clsx('text-gray-700 whitespace-pre-wrap font-sans leading-relaxed', className)}
        style={fontStyle}
      >
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
            {content && (
              <pre
                className={clsx(
                  'whitespace-pre-wrap font-sans leading-relaxed',
                  isChorus && 'font-bold text-gray-900 pl-3 border-l-2 border-gold-400',
                  isBridge && 'italic text-gray-700',
                  !isChorus && !isBridge && 'text-gray-700',
                )}
                style={fontStyle}
              >
                {content}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}
