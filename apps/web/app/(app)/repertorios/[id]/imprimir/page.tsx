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

/** Converte letra em HTML — sem exibir rótulos de seção, com negrito no refrão */
function lyricsToHtml(lyrics: string): string {
  if (!lyrics) return '';
  const lines = lyrics.split('\n');
  const parts: string[] = [];
  let inChorus = false;
  let inBridge = false;
  let blankCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Marcador de seção → apenas muda o estado, não renderiza
    if (SECTION_RE.test(trimmed)) {
      const lower = trimmed.slice(1, -1).toLowerCase();
      inChorus = lower.includes('refrão') || lower.includes('refrao');
      inBridge =
        lower.includes('ponte') || lower.includes('bridge') ||
        lower.includes('pré') || lower.includes('pre');
      blankCount = 0;
      continue;
    }

    // Linhas em branco — máximo 1 consecutiva
    if (trimmed === '') {
      if (blankCount < 1) { parts.push(''); blankCount++; }
      continue;
    }
    blankCount = 0;

    const escaped = escapeHtml(line);
    if (inChorus) {
      parts.push(`<strong>${escaped}</strong>`);
    } else if (inBridge) {
      parts.push(`<em>${escaped}</em>`);
    } else {
      parts.push(escaped);
    }
  }

  // Remove linhas em branco no início/fim
  while (parts.length && parts[0] === '') parts.shift();
  while (parts.length && parts[parts.length - 1] === '') parts.pop();

  return parts.join('\n');
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
        song:songs(
          id, title, author, composer, key_note, bpm, lyrics, chords,
          categories:song_categories(
            category:liturgical_categories(name, slug)
          )
        )
      )
    `)
    .eq('id', params.id)
    .single();

  if (error || !repertory) notFound();

  const celebrationSlug: string = (repertory as any).celebration ?? '';
  let celebrationName =
    CELEBRATION_LABELS[celebrationSlug as keyof typeof CELEBRATION_LABELS] ?? celebrationSlug;
  let celebrationIcon =
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
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Barra de controles (só na tela) ── */
    #print-controls-bar {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 9999;
      background: #1e3a5f;
      padding: 8px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* ── Wrapper da tela ── */
    #print-overlay {
      position: fixed;
      inset: 0;
      top: 44px;           /* abaixo da barra */
      z-index: 200;
      background: #c8c8c8;
      overflow-y: auto;
      display: flex;
      justify-content: center;
      padding: 20px 16px 40px;
      font-family: 'Georgia', 'Times New Roman', serif;
    }

    /* ── Folha A4 — largura fixa, altura livre (paginação automática no print) ── */
    .a4-page {
      width: 210mm;
      background: white;
      padding: 10mm 11mm 12mm;
      box-shadow: 0 2px 20px rgba(0,0,0,0.28);
    }

    /* ── Cabeçalho compacto ── */
    .rep-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 6px;
      border-bottom: 2px solid #C9A84C;
      padding-bottom: 5px;
      margin-bottom: 9px;
    }
    .rep-title {
      font-size: 12pt;
      font-weight: bold;
      color: #1e3a5f;
      line-height: 1.2;
    }
    .rep-meta {
      font-size: 7pt;
      color: #666;
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .rep-badge {
      background: #1e3a5f;
      color: white;
      font-size: 6.5pt;
      font-weight: bold;
      padding: 1px 8px;
      border-radius: 20px;
    }

    /* ── Grid 2 colunas ── */
    .songs-grid {
      columns: 2;
      column-gap: 0;
      column-rule: 1px solid #d1d5db;
    }

    /* ── Bloco de música ── */
    .song-block {
      break-inside: avoid;
      -webkit-column-break-inside: avoid;
      page-break-inside: avoid;
      padding: 0 8mm 9px 0;
      margin-bottom: 9px;
      border-bottom: 1px dashed #e5e7eb;
    }
    .song-block:last-child { border-bottom: none; margin-bottom: 0; }

    /* Segunda coluna: padding invertido */
    .songs-grid .song-block:nth-child(odd) {
      padding-left: 0;
      padding-right: 8mm;
    }

    /* ── Cabeçalho da música ── */
    .song-header {
      display: flex;
      align-items: flex-start;
      gap: 5px;
      margin-bottom: 2px;
    }
    .song-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #1e3a5f;
      color: white;
      font-size: 6pt;
      font-weight: bold;
      min-width: 15px;
      height: 15px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .song-title {
      font-size: 9pt;
      font-weight: bold;
      color: #1e3a5f;
      flex: 1;
      line-height: 1.25;
    }
    .song-key {
      font-family: 'Courier New', monospace;
      font-size: 6.5pt;
      font-weight: bold;
      background: #dbeafe;
      color: #1e40af;
      padding: 0 4px;
      border-radius: 3px;
      white-space: nowrap;
      border: 1px solid #bfdbfe;
      line-height: 1.6;
    }

    /* ── Categoria ── */
    .song-category {
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #C9A84C;
      margin-bottom: 2px;
      margin-left: 20px;
    }

    /* ── Autor ── */
    .song-author {
      font-size: 6.5pt;
      color: #9ca3af;
      font-style: italic;
      margin-bottom: 4px;
      margin-left: 20px;
    }

    /* ── Observação do item ── */
    .song-obs {
      font-size: 6.5pt;
      color: #6b7280;
      font-style: italic;
      border-left: 2px solid #e5e7eb;
      padding-left: 5px;
      margin-bottom: 4px;
    }

    /* ── Cifras ── */
    .chords-block {
      font-family: 'Courier New', monospace;
      font-size: 7pt;
      white-space: pre-wrap;
      line-height: 1.5;
      color: #1e3a5f;
      background: #eff6ff;
      border-left: 2px solid #93c5fd;
      padding: 3px 6px;
      border-radius: 0 3px 3px 0;
      margin-bottom: 4px;
    }

    /* ── Letra ── */
    .lyrics-block {
      font-size: 9pt;
      white-space: pre-wrap;
      line-height: 1.65;
      color: #1a1a1a;
      font-family: 'Georgia', serif;
      text-align: justify;
      hyphens: auto;
    }
    .lyrics-block strong {
      font-weight: 700;
    }
    .lyrics-block em {
      font-style: italic;
      color: #4b5563;
    }

    /* ── Rodapé ── */
    .rep-footer {
      margin-top: 10px;
      padding-top: 5px;
      border-top: 1px solid #e5e7eb;
      font-size: 6.5pt;
      color: #9ca3af;
      display: flex;
      justify-content: space-between;
    }

    /* ── Impressão / PDF ── */
    @page {
      size: A4;
      margin: 10mm 11mm;
    }
    @media print {
      html, body { background: white !important; }
      #print-controls-bar { display: none !important; }
      #print-overlay {
        position: static !important;
        background: none !important;
        padding: 0 !important;
        display: block !important;
        overflow: visible !important;
        top: 0 !important;
      }
      .a4-page {
        width: 100% !important;
        box-shadow: none !important;
        padding: 0 !important;
      }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Barra de controles */}
      <PrintControls />

      {/* Área de pré-visualização */}
      <div id="print-overlay">
        <div className="a4-page">

          {/* Cabeçalho do repertório */}
          <div className="rep-header">
            <div className="rep-title">
              {celebrationIcon} {repertory.title}
            </div>
            <div className="rep-meta">
              {celebrationName && <span>{celebrationName}</span>}
              {(repertory as any).event_date && (
                <span>📅 {formatDate((repertory as any).event_date)}</span>
              )}
              {(repertory as any).community && (
                <span>{(repertory as any).community}</span>
              )}
              <span className="rep-badge">
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
                .filter(Boolean).join(' / ');

              // Categoria: pega a primeira categoria associada à música
              const categoryName: string =
                song.categories?.[0]?.category?.name ?? '';

              return (
                <div key={item.id} className="song-block">
                  {/* Título + tom */}
                  <div className="song-header">
                    <span className="song-num">{idx + 1}</span>
                    <span className="song-title">{song.title}</span>
                    {displayKey && (
                      <span className="song-key">{displayKey}</span>
                    )}
                  </div>

                  {/* Categoria litúrgica */}
                  {categoryName && (
                    <div className="song-category">{categoryName}</div>
                  )}

                  {/* Autor/compositor */}
                  {authorLine && (
                    <div className="song-author">{authorLine}</div>
                  )}

                  {/* Observação do item no repertório */}
                  {item.observations && (
                    <div className="song-obs">{item.observations}</div>
                  )}

                  {/* Cifras (se houver) */}
                  {song.chords && (
                    <pre className="chords-block">{song.chords}</pre>
                  )}

                  {/* Letra */}
                  {song.lyrics ? (
                    <pre
                      className="lyrics-block"
                      dangerouslySetInnerHTML={{ __html: lyricsToHtml(song.lyrics) }}
                    />
                  ) : (
                    !song.chords && (
                      <p style={{ color: '#d1d5db', fontSize: '7pt', fontStyle: 'italic' }}>
                        Letra não cadastrada.
                      </p>
                    )
                  )}
                </div>
              );
            })}
          </div>

          {/* Rodapé */}
          <div className="rep-footer">
            <span>APPLetras — Repertório Litúrgico</span>
            <span>Impresso em {new Date().toLocaleDateString('pt-BR')}</span>
          </div>

        </div>
      </div>
    </>
  );
}
