import type { Metadata } from 'next';
import { Montserrat, Nunito } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-playfair', weight: ['400', '600', '700', '800', '900'] });
const nunito = Nunito({ subsets: ['latin'], variable: '--font-inter', weight: ['400', '500', '600', '700'] });

export const metadata: Metadata = {
  title: { default: 'APPLetras', template: '%s | APPLetras' },
  description: 'Plataforma de gestão de repertório para equipes de música da Igreja',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${nunito.variable} ${montserrat.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
