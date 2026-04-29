/**
 * PDF generation utilities for repertories.
 * Uses the browser's print API via the /imprimir route.
 * Server-side PDF generation can be added here using a library like @react-pdf/renderer.
 */

export interface RepertoryPDFOptions {
  repertoryId: string;
  title?: string;
  includeChords?: boolean;
}

/**
 * Opens the print dialog for a repertory.
 * The actual layout is rendered by /repertorios/[id]/imprimir/page.tsx
 */
export function openRepertoryPrint(repertoryId: string, pdf = false): void {
  const url = `/repertorios/${repertoryId}/imprimir${pdf ? '?pdf=1' : ''}`;
  window.open(url, '_blank');
}

/**
 * Generates a PDF blob from repertory data.
 * Placeholder for server-side PDF generation.
 */
export async function generateRepertoryPDF(repertoryId: string): Promise<void> {
  window.open(`/repertorios/${repertoryId}/imprimir?pdf=1`, '_blank');
}
