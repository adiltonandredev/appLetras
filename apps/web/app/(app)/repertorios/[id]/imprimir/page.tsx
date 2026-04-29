import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CELEBRATION_LABELS, CELEBRATION_ICONS, formatDate } from '@rl/utils';

export const metadata: Metadata = { title: 'Imprimir Repertório' };

interface Props { params: { id: string }; searchParams: { pdf?: string } }

export default async function PrintRepertoryPage({ params, searchParams }: Props) {
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

  const items = (repertory.items ?? []).sort((a: any, b: any) => a.position - b.position);
  const isPDF = searchParams.pdf === '1';
  const icon = CELEBRATION_ICONS[repertory.celebration_type] ?? '🎵';
  const celebrationLabel = CELEBRATION_LABELS[repertory.celebration_type] ?? repertory.celebration_type;

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${repertory.title} — Repertório Litúrgico`}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #1a1a1a;
            background: white;
            padding: 20mm 18mm;
          }
          .header {
            border-bottom: 2px solid #1e3a5f;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .header h1 {
            font-size: 20pt;
            font-weight: bold;
            color: #1e3a5f;
          }
          .header .meta {
            font-size: 9pt;
            color: #555;
            margin-top: 4px;
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
          }
          .song-count {
            background: #1e3a5f;
            color: white;
            font-size: 9pt;
            padding: 2px 10px;
            border-radius: 20px;
            display: inline-block;
            margin-top: 8px;
          }
          .song-block {
            margin-bottom: 28px;
            page-break-inside: avoid;
          }
          .song-number {
            display: inline-block;
            background: #1e3a5f;
            color: white;
            font-size: 8pt;
            font-weight: bold;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            text-align: center;
            line-height: 22px;
            margin-right: 8px;
            vertical-align: middle;
            flex-shrink: 0;
          }
          .song-header {
            display: flex;
            align-items: center;
            border-bottom: 1px solid #ddd;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .song-title {
            font-size: 13pt;
            font-weight: bold;
            color: #1e3a5f;
            flex: 1;
          }
          .song-meta {
            font-size: 8.5pt;
            color: #777;
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-bottom: 8px;
          }
          .song-meta span strong { color: #1e3a5f; }
          .song-key {
            font-family: monospace;
            font-weight: bold;
            background: #eff6ff;
            color: #1e3a5f;
            padding: 1px 6px;
            border-radius: 4px;
          }
          .lyrics {
            font-size: 10.5pt;
            white-space: pre-wrap;
            line-height: 1.65;
            color: #333;
          }
          .chords {
            font-family: 'Courier New', monospace;
            font-size: 9.5pt;
            white-space: pre-wrap;
            line-height: 1.7;
            color: #444;
            background: #f8f8f8;
            border-left: 3px solid #1e3a5f;
            padding: 8px 12px;
            border-radius: 0 4px 4px 0;
          }
          .obs {
            margin-top: 6px;
            font-size: 9pt;
            color: #666;
            font-style: italic;
            border-left: 2px solid #e5e7eb;
            padding-left: 8px;
          }
          .footer {
            margin-top: 32px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
            font-size: 8pt;
            color: #999;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        `}</style>
      </head>
      <body>
        {/* Print / back bar — hidden on print */}
        <div className="no-print" style={{ marginBottom: 20, display: 'flex', gap: 8 }}>
          <button
            onClick={() => window.history.back()}
            style={{ padding: '6px 14px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', background: 'white' }}
          >
            ← Voltar
          </button>
          <button
            onClick={() => window.print()}
            style={{ padding: '6px 14px', border: 'none', borderRadius: 6, cursor: 'pointer', background: '#1e3a5f', color: 'white', fontWeight: 600 }}
          >
            🖨️ Imprimir / Salvar PDF
          </button>
        </div>

        {/* Header */}
        <div className="header">
          <h1>{icon} {repertory.title}</h1>
          <div className="meta">
            <span>{celebrationLabel}</span>
            {repertory.date && <span>📅 {formatDate(repertory.date)}</span>}
            {repertory.community && <span>🏛️ {repertory.community}</span>}
            {repertory.creator && <span>Criado por {(repertory.creator as any).full_name}</span>}
          </div>
          <span className="song-count">{items.length} música{items.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Songs */}
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
                  {song.author && <span>Autor: <strong>{song.author}</strong></span>}
                  {song.bpm && <span>BPM: <strong>{song.bpm}</strong></span>}
                </div>
              )}

              {item.observations && (
                <p className="obs">{item.observations}</p>
              )}

              {song.chords ? (
                <pre className="chords">{song.chords}</pre>
              ) : song.lyrics ? (
                <pre className="lyrics">{song.lyrics}</pre>
              ) : (
                <p style={{ color: '#aaa', fontSize: '9pt', fontStyle: 'italic' }}>Letra não cadastrada.</p>
              )}
            </div>
          );
        })}

        {/* Footer */}
        <div className="footer">
          <span>Repertório Litúrgico</span>
          <span>Impresso em {new Date().toLocaleDateString('pt-BR')}</span>
        </div>

        {isPDF && (
          <script dangerouslySetInnerHTML={{ __html: 'window.onload = () => window.print();' }} />
        )}
      </body>
    </html>
  );
}
