import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CELEBRATION_LABELS, CELEBRATION_ICONS, formatDate } from '@rl/utils';
import { PrintControls } from '@/components/repertories/PrintControls';

export const metadata: Metadata = { title: 'Imprimir Repertório' };

const SECTION_RE =
  /^\[(Refrão|Refrao|REFRÃO|Estrofe\s*\d*|Verso\s*\d*|Ponte|Pré-Refrão|Pre-Refrão|Coda|Intro|Final|Bridge)\]$/i;

function escapeHtml(t: string) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
        lower.includes('ponte') || lower.includes('bridge') ||
        lower.includes('pré') || lower.includes('pre');

      // Exibe o rótulo da seção
      const labelClass = inChorus ? 'section-chorus' : inBridge ? 'section-bridge' : 'section-verse';
      html += `<span class="section-label ${labelClass}">${escapeHtml(inner)}</span>\n`;
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

interface Props { params: { id: string } }

export default async function PrintRepertoryPage({ params }: Props) {
  const supabase = createClient();

  const { data: repertory, error } = await supabase
    .from('repertories')
    .select(`
      *,
      creator:users!created_by(full_name),
      items:repertory_items(
        id, position, custom_key, observations,
        song:songs(id, title, author, composer, key_note, bpm, lyrics, chords)
      )
    `)
    .eq('id', params.id)
    .single();

  if (error || !repertory) notFound();

  const celebrationSlug: string = (repertory as any).celebration ?? '';
  let celebrationName: string =
    CELEBRATION_LABELS[celebrationSlug as keyof typeof CELEBRATION_LABELS] ?? celebrationSlug;
  let celebrationIcon: string =
    CELEBRATION_ICONS[celebrationSlug as keyof typeof CELEBRATION_ICONS] ?? '🎵';

  if (celebrationSlug && !CELEBRATION_LABELS[celebrationSlug as keyof typeof CELEBRATION_LABELS]) {
    const { data: ct } = await supabase
      .from('celebration_types')
      .select('name, icon')
      .eq('slug', celebrationSlug)
      .maybeSingle();
    if (ct) { celebrationName = ct.name; celebrationIcon = ct.icon; }
  }

  const items = ((repertory.items ?? []) as any[]).sort(
    (a: any, b: any) => a.position - b.position
  );

  const css = `
    /* ── Reset ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Overlay (tela) ── */
    #print-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: #e8e8e8;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px 16px 40px;
      font-family: 'Georgia', 'Times New Roman', serif;
    }

    /* ── Folha A4 (tela) ── */
    .a4-page {
      width: 210mm;
      min-height: 297mm;
      background: white;
      box-shadow: 0 4px 24px rgba(0,0,0,0.25);
      padding: 10mm 10mm 10mm;
      position: relative;
    }

    /* ── Cabeçalho compacto ── */
    .print-header {
      border-bottom: 2.5px solid #C9A84C;
      padding-bottom: 5px;
      margin-bottom: 8px;
      display: flex;
      align-items: baseline;
      gap: 10px;
      flex-wrap: wrap;
    }
    .print-header h1 {
      font-size: 13pt;
      font-weight: bold;
      color: #1e3a5f;
      line-height: 1.2;
    }
    .print-header-meta {
      font-size: 7.5pt;
      color: #666;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      flex: 1;
    }
    .print-header-meta span { white-space: nowrap; }
    .song-count-badge {
      background: #1e3a5f;
      color: white;
      font-size: 7pt;
      font-weight: bold;
      padding: 1px 8px;
      border-radius: 20px;
      white-space: nowrap;
    }

    /* ── Grid 2 colunas ── */
    .songs-grid {
      columns: 2;
      column-gap: 7mm;
      column-fill: balance;
    }

    /* ── Bloco de cada música ── */
    .song-block {
      break-inside: avoid;
      -webkit-column-break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px dashed #e0e0e0;
    }
    .song-block:last-child { border-bottom: none; }

    .song-header {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 3px;
    }
    .song-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #1e3a5f;
      color: white;
      font-size: 6.5pt;
      font-weight: bold;
      min-width: 16px;
      height: 16px;
      border-radius: 50%;
      flex-shrink: 0;
      padding: 0 2px;
    }
    .song-title {
      font-size: 9.5pt;
      font-weight: bold;
      color: #1e3a5f;
      flex: 1;
      line-height: 1.2;
    }
    .song-key {
      font-family: 'Courier New', monospace;
      font-size: 7pt;
      font-weight: bold;
      background: #eff6ff;
      color: #1e3a5f;
      padding: 0 4px;
      border-radius: 3px;
      border: 1px solid #bfdbfe;
      white-space: nowrap;
    }
    .song-author {
      font-size: 7pt;
      color: #888;
      margin-bottom: 4px;
      font-style: italic;
    }

    /* ── Cifras ── */
    .chords-block {
      font-family: 'Courier New', monospace;
      font-size: 7.5pt;
      white-space: pre-wrap;
      line-height: 1.55;
      color: #1e3a5f;
      background: #f0f4ff;
      border-left: 2.5px solid #1e3a5f;
      padding: 4px 6px;
      border-radius: 0 3px 3px 0;
      margin-bottom: 4px;
    }

    /* ── Letra ── */
    .lyrics-block {
      font-size: 8pt;
      white-space: pre-wrap;
      line-height: 1.6;
      color: #222;
      font-family: 'Georgia', serif;
    }
    .lyrics-block strong { font-weight: 700; color: #111; }
    .lyrics-block em    { font-style: italic; color: #555; }

    .section-label {
      display: inline-block;
      font-size: 6pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0 5px;
      border-radius: 10px;
      margin-bottom: 1px;
      margin-top: 4px;
      line-height: 1.6;
    }
    .section-chorus { background: #fef3c7; color: #92400e; }
    .section-bridge { background: #f3e8ff; color: #7e22ce; }
    .section-verse  { background: #f3f4f6; color: #4b5563; }

    .obs-block {
      font-size: 6.5pt;
      color: #777;
      font-style: italic;
      border-left: 2px solid #e5e7eb;
      padding-left: 5px;
      margin-bottom: 3px;
    }

    /* ── Rodapé ── */
    .print-footer {
      margin-top: 8px;
      padding-top: 5px;
      border-top: 1px solid #ddd;
      font-size: 7pt;
      color: #aaa;
      display: flex;
      justify-content: space-between;
    }

    /* ── Barra de controles (tela) ── */
    #print-controls-bar {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 10000;
      background: #1e3a5f;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    /* ── Print media ── */
    @page {
      size: A4;
      margin: 8mm 10mm 8mm;
    }
    @media print {
      body { background: white !important; }
      #print-overlay {
        position: static !important;
        background: none !important;
        padding: 0 !important;
        display: block !important;
      }
      .a4-page {
        width: 100% !important;
        min-height: auto !important;
        box-shadow: none !important;
        padding: 0 !important;
      }
      #print-controls-bar { display: none !important; }
      .no-print { display: none !important; }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div id="print-overlay">
        {/* Barra de controles — só na tela */}
        <PrintControls />

        {/* Folha A4 */}
        <div className="a4-page">
          {/* Cabeçalho compacto */}
          <div className="print-header">
            <h1>{celebrationIcon} {repertory.title}</h1>
            <div className="print-header-meta">
              {celebrationName && <span>{celebrationName}</span>}
              {(repertory as any).event_date && (
                <span>📅 {formatDate((repertory as any).event_date)}</span>
              )}
              {(repertory as any).community && (
                <span>{(repertory as any).community}</span>
              )}
              <span className="song-count-badge">
                {items.length} música{items.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Grid 2 colunas */}
          <div className="songs-grid">
            {items.map((item: any, idx: number) => {
              const song = item.song;
              if (!song) return null;
              const displayKey = item.custom_key ?? song.key_note;
              const authorLine = [song.author, song.composer]
                .filter(Boolean)
                .join(' / ');

              return (
                <div key={item.id} className="song-block">
                  {/* Título + tom */}
                  <div className="song-header">
                    <span className="song-number">{idx + 1}</span>
                    <span className="song-title">{song.title}</span>
                    {displayKey && (
                      <span className="song-key">{displayKey}</span>
                    )}
                  </div>

                  {/* Autor */}
                  {authorLine && (
                    <div className="song-author">{authorLine}</div>
                  )}

                  {/* Observação do item no repertório */}
                  {item.observations && (
                    <div className="obs-block">{item.observations}</div>
                  )}

                  {/* Cifras (sempre exibe se existir) */}
                  {song.chords && (
                    <pre className="chords-block">{song.chords}</pre>
                  )}

                  {/* Letra (sempre exibe se existir) */}
                  {song.lyrics ? (
                    <pre
                      className="lyrics-block"
                      dangerouslySetInnerHTML={{ __html: lyricsToHtml(song.lyrics) }}
                    />
                  ) : (
                    !song.chords && (
                      <p style={{ color: '#bbb', fontSize: '7pt', fontStyle: 'italic' }}>
                        Letra não cadastrada.
                      </p>
                    )
                  )}
                </div>
              );
            })}
          </div>

          {/* Rodapé */}
          <div className="print-footer">
            <span>APPLetras — Repertório Litúrgico</span>
            <span>Impresso em {new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </div>
    </>
  );
}
