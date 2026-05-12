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
  const parts: string[] = [];
  let inChorus = false;
  let inBridge = false;
  let lastBlank = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (SECTION_RE.test(trimmed)) {
      const lower = trimmed.slice(1, -1).toLowerCase();
      inChorus = lower.includes('refrão') || lower.includes('refrao');
      inBridge  = lower.includes('ponte') || lower.includes('bridge')
               || lower.includes('pré')   || lower.includes('pre');
      continue;
    }
    if (trimmed === '') {
      if (!lastBlank) { parts.push(''); lastBlank = true; }
      continue;
    }
    lastBlank = false;
    const esc = escapeHtml(line);
    if (inChorus)      parts.push(`<strong>${esc}</strong>`);
    else if (inBridge) parts.push(`<em>${esc}</em>`);
    else               parts.push(esc);
  }
  while (parts.length && parts[0] === '')            parts.shift();
  while (parts.length && parts[parts.length-1]==='') parts.pop();
  return parts.join('\n');
}

interface Props { params: { id: string } }

export default async function PrintRepertoryPage({ params }: Props) {
  const supabase = createClient();

  const { data: rep, error } = await supabase
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

  if (error || !rep) notFound();

  const slug: string = (rep as any).celebration ?? '';
  let celName = CELEBRATION_LABELS[slug as keyof typeof CELEBRATION_LABELS] ?? slug;
  let celIcon  = CELEBRATION_ICONS[slug  as keyof typeof CELEBRATION_ICONS]  ?? '🎵';
  if (slug && !CELEBRATION_LABELS[slug as keyof typeof CELEBRATION_LABELS]) {
    const { data: ct } = await supabase
      .from('celebration_types').select('name,icon').eq('slug',slug).maybeSingle();
    if (ct) { celName = ct.name; celIcon = ct.icon; }
  }

  const items = ((rep.items ?? []) as any[])
    .sort((a:any,b:any) => a.position - b.position);

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Barra de controles (tela) ── */
    #ctrl-bar {
      position: fixed; top:0; left:0; right:0; z-index:9999;
      background: #1e3a5f; padding: 8px 20px;
      display: flex; align-items: center; gap: 12px;
    }

    /* ── Wrapper de pré-visualização (tela) ── */
    #screen-wrap {
      position: fixed; inset: 0; top: 42px; z-index: 200;
      background: #909090; overflow-y: auto;
      display: flex; justify-content: center;
      padding: 24px 16px 48px;
    }

    /* ── Folha: largura A4, altura natural ── */
    .sheet {
      width: 210mm;
      background: white;
      box-shadow: 0 4px 28px rgba(0,0,0,.4);
      padding: 10mm 11mm;
      /* SEM height fixo — o browser gerencia a quebra de página ao imprimir */
    }

    /* ── Cabeçalho compacto ── */
    .rh {
      display: flex; align-items: baseline; justify-content: space-between;
      flex-wrap: wrap; gap: 5px;
      border-bottom: 2px solid #C9A84C;
      padding-bottom: 4px; margin-bottom: 8px;
    }
    .rh-title {
      font-size: 11pt; font-weight: bold; color: #1e3a5f;
      line-height: 1.2; font-family: Georgia, serif;
    }
    .rh-meta {
      font-size: 6.5pt; color: #666;
      display: flex; gap: 8px; align-items: center;
      flex-wrap: wrap; font-family: sans-serif;
    }
    .rh-badge {
      background: #1e3a5f; color: white; font-size: 6pt; font-weight: 700;
      padding: 1px 7px; border-radius: 20px;
    }

    /* ── Duas colunas — sem height fixo, sem column-fill: auto ── */
    .cols {
      columns: 2;
      column-gap: 8mm;
      column-rule: 1px solid #d4d4d4;
      /* column-fill: balance é o padrão — distribui igualmente */
    }

    /* ── Bloco de música ── */
    .sb {
      break-inside: avoid;
      -webkit-column-break-inside: avoid;
      page-break-inside: avoid;
      padding-bottom: 8px;
      margin-bottom: 8px;
      border-bottom: 1px dashed #e0e0e0;
    }
    .sb:last-child { border-bottom: none; margin-bottom: 0; }

    /* ── Título da música ── */
    .sh { display: flex; align-items: flex-start; gap: 4px; margin-bottom: 2px; }
    .sn {
      display: inline-flex; align-items: center; justify-content: center;
      background: #1e3a5f; color: white; font-size: 5.5pt; font-weight: 700;
      min-width: 14px; height: 14px; border-radius: 50%;
      flex-shrink: 0; margin-top: 1px; font-family: sans-serif;
    }
    .st {
      font-size: 8.5pt; font-weight: bold; color: #1e3a5f;
      flex: 1; line-height: 1.25; font-family: Georgia, serif;
    }
    .sk {
      font-family: 'Courier New', monospace; font-size: 6pt; font-weight: bold;
      background: #dbeafe; color: #1e40af; padding: 0 4px; border-radius: 3px;
      border: 1px solid #bfdbfe; line-height: 1.7; white-space: nowrap;
    }

    /* ── Categoria litúrgica ── */
    .sc {
      font-size: 6pt; font-weight: 700; text-transform: uppercase;
      letter-spacing: .06em; color: #C9A84C;
      margin: 1px 0 2px 18px; font-family: sans-serif;
    }

    /* ── Autor ── */
    .sa {
      font-size: 6pt; color: #9ca3af; font-style: italic;
      margin: 0 0 3px 18px; font-family: sans-serif;
    }

    /* ── Observação do item ── */
    .so {
      font-size: 6pt; color: #6b7280; font-style: italic;
      border-left: 2px solid #e5e7eb; padding-left: 4px;
      margin-bottom: 3px; font-family: sans-serif;
    }

    /* ── Cifras ── */
    .chords {
      font-family: 'Courier New', monospace; font-size: 6.5pt;
      white-space: pre-wrap; line-height: 1.5; color: #1e3a5f;
      background: #eff6ff; border-left: 2px solid #93c5fd;
      padding: 3px 5px; border-radius: 0 3px 3px 0; margin-bottom: 3px;
    }

    /* ── Letra ── */
    .lyr {
      font-size: 8.5pt; white-space: pre-wrap; line-height: 1.7;
      color: #111; font-family: Georgia, serif;
      text-align: justify; hyphens: auto; margin: 0;
    }
    .lyr strong { font-weight: 700; }
    .lyr em     { font-style: italic; color: #4b5563; }

    /* ── Rodapé ── */
    .rf {
      margin-top: 8px; padding-top: 5px; border-top: 1px solid #e5e7eb;
      font-size: 6pt; color: #aaa; display: flex; justify-content: space-between;
      font-family: sans-serif;
    }

    /* ── Impressão ── */
    @page {
      size: 210mm 297mm;   /* retrato explícito */
      margin: 10mm 11mm;
    }
    @media print {
      html, body { background: white !important; }
      #ctrl-bar { display: none !important; }
      #screen-wrap {
        position: static !important; background: none !important;
        padding: 0 !important; display: block !important;
        overflow: visible !important; top: 0 !important;
      }
      .sheet {
        width: 100% !important; box-shadow: none !important; padding: 0 !important;
      }
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <PrintControls />

      <div id="screen-wrap">
        <div className="sheet">

          {/* Cabeçalho */}
          <div className="rh">
            <div className="rh-title">{celIcon} {rep.title}</div>
            <div className="rh-meta">
              {celName && <span>{celName}</span>}
              {(rep as any).event_date && <span>📅 {formatDate((rep as any).event_date)}</span>}
              {(rep as any).community  && <span>{(rep as any).community}</span>}
              <span className="rh-badge">{items.length} música{items.length!==1?'s':''}</span>
            </div>
          </div>

          {/* 2 colunas */}
          <div className="cols">
            {items.map((item:any, idx:number) => {
              const song = item.song;
              if (!song) return null;
              const displayKey   = item.custom_key ?? song.key_note;
              const authorLine   = song.author ?? '';
              const categoryName = song.categories?.[0]?.category?.name ?? '';

              return (
                <div key={item.id} className="sb">
                  <div className="sh">
                    <span className="sn">{idx+1}</span>
                    <span className="st">{song.title}</span>
                    {displayKey && <span className="sk">{displayKey}</span>}
                  </div>

                  {categoryName && <div className="sc">{categoryName}</div>}
                  {authorLine   && <div className="sa">{authorLine}</div>}
                  {item.observations && <div className="so">{item.observations}</div>}

                  {song.chords && <pre className="chords">{song.chords}</pre>}

                  {song.lyrics ? (
                    <pre
                      className="lyr"
                      dangerouslySetInnerHTML={{ __html: lyricsToHtml(song.lyrics) }}
                    />
                  ) : (!song.chords && (
                    <p style={{color:'#d1d5db',fontSize:'6.5pt',fontStyle:'italic'}}>
                      Letra não cadastrada.
                    </p>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Rodapé */}
          <div className="rf">
            <span>APPLetras — Repertório Litúrgico</span>
            <span>Impresso em {new Date().toLocaleDateString('pt-BR')}</span>
          </div>

        </div>
      </div>
    </>
  );
}
