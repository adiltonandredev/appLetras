import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CELEBRATION_LABELS, CELEBRATION_ICONS, formatDate } from '@rl/utils';
import { PrintControls } from '@/components/repertories/PrintControls';

export const metadata: Metadata = { title: 'Imprimir Repertório' };

const SECTION_RE =
  /^\[(Refrão|Refrao|REFRÃO|Estrofe\s*\d*|Verso\s*\d*|Ponte|Pré-Refrão|Pre-Refrão|Coda|Intro|Final|Bridge)\]$/i;

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function lyricsToHtml(lyrics: string): string {
  if (!lyrics) return '';
  const lines = lyrics.split('\n');
  let html = '';
  let inChorus = false;
  let inBridge = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (SECTION_RE.test(trimmed)) {
      const inner = trimmed.slice(1, -1);
      const lower = inner.toLowerCase();
      inChorus = lower.includes('refrão') || lower.includes('refrao');
      inBridge =
        lower.includes('ponte') ||
        lower.includes('bridge') ||
        lower.includes('pré') ||
        lower.includes('pre');
    } else if (inChorus) {
      html += `<strong>${escapeHtml(line)}</strong>\n`;
    } else if (inBridge) {
      html += `<em>${escapeHtml(line)}</em>\n`;
    } else {
      html += `${escapeHtml(line)}\n`;
    }
  }
  return html;
}

interface Props {
  params: { id: string };
}

export default async function PrintRepertoryPage({ params }: Props) {
  const supabase = createClient();

  const { data: repertory, error } = await supabase
    .from('repertories')
    .select(`
      *,
      creator:users!created_by(full_name),
      items:repertory_items(
        id, position, custom_key, observations,
        song:songs(id, title, author, key_note, bpm, lyrics, chords)
      )
    `)
    .eq('id', params.id)
    .single();

  if (error || !repertory) notFound();

  // Coluna no DB: "celebration" (slug de texto)
  const celebrationSlug: string = (repertory as any).celebration ?? '';
  let celebrationName: string =
    CELEBRATION_LABELS[celebrationSlug as keyof typeof CELEBRATION_LABELS] ?? celebrationSlug;
  let celebrationIcon: string =
    CELEBRATION_ICONS[celebrationSlug as keyof typeof CELEBRATION_ICONS] ?? '🎵';

  // Se slug não está nas constantes (tipo de celebração customizado), busca no DB
  if (celebrationSlug && !CELEBRATION_LABELS[celebrationSlug as keyof typeof CELEBRATION_LABELS]) {
    const { data: ct } = await supabase
      .from('celebration_types')
      .select('name, icon')
      .eq('slug', celebrationSlug)
      .maybeSingle();
    if (ct) {
      celebrationName = ct.name;
      celebrationIcon = ct.icon;
    }
  }

  const items = ((repertory.items ?? []) as any[]).sort(
    (a: any, b: any) => a.position - b.position
  );

  return (
    <>
      {/* Overlay full-screen sobre o layout do app + estilos de impressão */}
      <style dangerouslySetInnerHTML={{ __html: `
        #print-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: white;
          overflow-y: auto;
          padding: 20px 28px 40px;
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 11pt;
          line-height: 1.5;
          color: #1a1a1a;
        }
        .print-header {
          border-bottom: 3px solid #C9A84C;
          padding-bottom: 12px;
          margin-bottom: 20px;
          margin-top: 52px;
        }
        .print-header h1 { font-size: 20pt; font-weight: bold; color: #1e3a5f; margin: 0; }
        .print-meta {
          font-size: 9pt; color: #555; margin-top: 4px;
          display: flex; gap: 16px; flex-wrap: wrap;
        }
        .song-count {
          background: #1e3a5f; color: white; font-size: 9pt;
          padding: 2px 10px; border-radius: 20px;
          display: inline-block; margin-top: 8px;
        }
        .song-block { margin-bottom: 28px; page-break-inside: avoid; }
        .song-header {
          display: flex; align-items: center;
          border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 8px;
        }
        .song-number {
          display: inline-flex; align-items: center; justify-content: center;
          background: #1e3a5f; color: white; font-size: 8pt; font-weight: bold;
          width: 22px; height: 22px; border-radius: 50%;
          margin-right: 8px; flex-shrink: 0;
        }
        .song-title { font-size: 13pt; font-weight: bold; color: #1e3a5f; flex: 1; }
        .song-meta {
          font-size: 8.5pt; color: #777;
          display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 8px;
        }
        .song-meta strong { color: #1e3a5f; }
        .song-key {
          font-family: monospace; font-weight: bold;
          background: #eff6ff; color: #1e3a5f;
          padding: 1px 6px; border-radius: 4px; margin-left: 8px;
        }
        .lyrics {
          font-size: 10.5pt; white-space: pre-wrap;
          line-height: 1.65; color: #333; font-family: 'Georgia', serif;
          margin: 0;
        }
        .lyrics strong { color: #1a1a1a; font-weight: bold; }
        .lyrics em { color: #555; font-style: italic; }
        .chords {
          font-family: 'Courier New', monospace; font-size: 9.5pt;
          white-space: pre-wrap; line-height: 1.7; color: #444;
          background: #f8f8f8; border-left: 3px solid #1e3a5f;
          padding: 8px 12px; border-radius: 0 4px 4px 0; margin: 0;
        }
        .obs {
          margin-top: 6px; font-size: 9pt; color: #666; font-style: italic;
          border-left: 2px solid #e5e7eb; padding-left: 8px;
        }
        .print-footer {
          margin-top: 32px; padding-top: 10px; border-top: 1px solid #ddd;
          font-size: 8pt; color: #999; display: flex; justify-content: space-between;
        }
        @media print {
          #print-overlay { position: static; overflow: visible; padding: 0; }
          .no-print { display: none !important; }
        }
      `}} />

      <div id="print-overlay">
        <PrintControls />

        {/* Cabeçalho do repertório */}
        <div className="print-header">
          <h1>{celebrationIcon} {repertory.title}</h1>
          <div className="print-meta">
            {celebrationName && <span>{celebrationName}</span>}
            {(repertory as any).event_date && (
              <span>📅 {formatDate((repertory as any).event_date)}</span>
            )}
            {(repertory as any).community && (
              <span>🏛️ {(repertory as any).community}</span>
            )}
            {(repertory as any).creator && (
              <span>Criado por {(repertory as any).creator.full_name}</span>
            )}
          </div>
          <span className="song-count">
            {items.length} música{items.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Lista de músicas */}
        {items.map((item: any, idx: number) => {
          const song = item.song;
          if (!song) return null;
          const displayKey = item.custom_key ?? song.key_note;

          return (
            <div key={item.id} className="song-block">
              <div className="song-header">
                <span className="song-number">{idx + 1}</span>
                <span className="song-title">{song.title}</span>
                {displayKey && <span className="song-key">{displayKey}</span>}
              </div>

              {(song.author || song.bpm) && (
                <div className="song-meta">
                  {song.author && (
                    <span>Autor: <strong>{song.author}</strong></span>
                  )}
                  {song.bpm && (
                    <span>BPM: <strong>{song.bpm}</strong></span>
                  )}
                </div>
              )}

              {item.observations && (
                <p className="obs">{item.observations}</p>
              )}

              {song.chords ? (
                <pre className="chords">{song.chords}</pre>
              ) : song.lyrics ? (
                <pre
                  className="lyrics"
                  dangerouslySetInnerHTML={{ __html: lyricsToHtml(song.lyrics) }}
                />
              ) : (
                <p style={{ color: '#aaa', fontSize: '9pt', fontStyle: 'italic' }}>
                  Letra não cadastrada.
                </p>
              )}
            </div>
          );
        })}

        {/* Rodapé */}
        <div className="print-footer">
          <span>APPLetras — Repertório Litúrgico</span>
          <span>Impresso em {new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    </>
  );
}
