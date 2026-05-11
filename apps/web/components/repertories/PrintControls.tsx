'use client';

import { useRouter } from 'next/navigation';

export function PrintControls() {
  const router = useRouter();

  return (
    <div
      className="no-print"
      style={{
        position: 'fixed',
        top: 12,
        right: 16,
        display: 'flex',
        gap: 8,
        zIndex: 100,
      }}
    >
      <button
        onClick={() => router.back()}
        style={{
          padding: '8px 16px',
          border: '1px solid #ddd',
          borderRadius: 8,
          cursor: 'pointer',
          background: 'white',
          fontFamily: 'sans-serif',
          fontSize: 13,
          color: '#374151',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}
      >
        ← Voltar
      </button>
      <button
        onClick={() => window.print()}
        style={{
          padding: '8px 16px',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          background: '#1e3a5f',
          color: 'white',
          fontWeight: 600,
          fontFamily: 'sans-serif',
          fontSize: 13,
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }}
      >
        🖨️ Imprimir / Salvar PDF
      </button>
    </div>
  );
}
