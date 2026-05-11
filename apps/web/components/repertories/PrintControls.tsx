'use client';

import { useRouter } from 'next/navigation';

export function PrintControls() {
  const router = useRouter();

  return (
    <div
      id="print-controls-bar"
      className="no-print"
    >
      {/* Logo compacto */}
      <span style={{
        color: '#C9A84C',
        fontWeight: 800,
        fontSize: 15,
        fontFamily: 'serif',
        marginRight: 8,
        letterSpacing: '-0.3px',
      }}>
        🎵 APPLetras
      </span>

      <div style={{ flex: 1 }} />

      <span style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'sans-serif' }}>
        Pré-visualização A4 · 2 colunas
      </span>

      <button
        onClick={() => router.back()}
        style={{
          padding: '7px 16px',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 7,
          cursor: 'pointer',
          background: 'transparent',
          fontFamily: 'sans-serif',
          fontSize: 13,
          color: '#cbd5e1',
        }}
      >
        ← Voltar
      </button>

      <button
        onClick={() => window.print()}
        style={{
          padding: '7px 20px',
          border: 'none',
          borderRadius: 7,
          cursor: 'pointer',
          background: '#C9A84C',
          color: '#1e3a5f',
          fontWeight: 700,
          fontFamily: 'sans-serif',
          fontSize: 13,
        }}
      >
        🖨️ Imprimir / Salvar PDF
      </button>
    </div>
  );
}
