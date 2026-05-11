'use client';

import { useRouter } from 'next/navigation';

export function PrintControls() {
  const router = useRouter();

  return (
    <div id="print-controls-bar">
      <span style={{
        color: '#C9A84C',
        fontWeight: 800,
        fontSize: 14,
        fontFamily: 'serif',
        letterSpacing: '-0.3px',
      }}>
        🎵 APPLetras
      </span>

      <div style={{ flex: 1 }} />

      <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'sans-serif' }}>
        Pré-visualização A4 · 2 colunas
      </span>

      <button
        onClick={() => router.back()}
        style={{
          padding: '6px 14px',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 6,
          cursor: 'pointer',
          background: 'transparent',
          fontFamily: 'sans-serif',
          fontSize: 12,
          color: '#94a3b8',
        }}
      >
        ← Voltar
      </button>

      <button
        onClick={() => window.print()}
        style={{
          padding: '6px 18px',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          background: '#C9A84C',
          color: '#1e3a5f',
          fontWeight: 700,
          fontFamily: 'sans-serif',
          fontSize: 12,
        }}
      >
        🖨️ Imprimir / Salvar PDF
      </button>
    </div>
  );
}
