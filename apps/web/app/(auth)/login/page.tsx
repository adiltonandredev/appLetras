import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SacredBackground } from '@/components/ui/SacredBackground';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Entrar' };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* ── Left panel: Sacro Moderno ───────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0D2347 0%, #1B3A6B 50%, #142C52 100%)' }}
      >
        {/* Sacred background watermark */}
        <SacredBackground variant="dark" opacity={0.08} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-gold-300 to-gold-500 rounded-2xl flex items-center justify-center border-2 border-gold-200 shadow-lg">
            <svg className="w-8 h-8 text-brand-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <div>
            <p className="text-white font-serif font-black text-2xl leading-none">APPLetras</p>
            <p className="text-gold-300 text-xs font-medium tracking-widest">MÚSICA LITÚRGICA</p>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="font-serif text-5xl font-black text-white leading-tight mb-6">
              Sua música,<br />
              seu ministério,<br />
              <span className="text-gold-300">sua celebração.</span>
            </h1>
            <p className="text-blue-100 text-lg leading-relaxed max-w-md font-light">
              A plataforma completa para equipes de música da Igreja organizarem repertórios, gerenciarem letras e celebrarem com mais fluidez e organização.
            </p>
          </div>

          {/* Feature bullets */}
          <div className="space-y-4">
            {[
              { icon: '🕊️', label: 'Repertórios organizados com drag & drop' },
              { icon: '✝️', label: 'Fluxo de aprovação de letras' },
              { icon: '🎵', label: 'Acesso offline no mobile durante celebrações' },
              { icon: '👥', label: 'Equipe conectada com permissões granulares' },
              { icon: '📄', label: 'Impressão e PDF profissional' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <span className="text-blue-100 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom note */}
        <p className="relative z-10 text-gold-300/70 text-sm font-light">
          Conteúdo próprio, autorizado ou licenciado.
        </p>
      </div>

      {/* ── Right panel: Form ────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-sacred-bg relative">
        {/* Subtle sacred watermark background */}
        <SacredBackground variant="light" opacity={0.03} />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center justify-center gap-4 mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-gold-300 to-gold-500 rounded-3xl flex items-center justify-center border-2 border-gold-200 shadow-lg">
              <svg className="w-10 h-10 text-brand-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-serif font-black text-brand-900 text-3xl leading-none">APPLetras</p>
              <p className="text-gold-500 text-xs font-medium tracking-widest mt-1">MÚSICA LITÚRGICA</p>
            </div>
          </div>

          {/* Login card with glass morphism */}
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/60 p-8 lg:p-10">
            <div className="mb-8">
              <h2 className="font-serif text-3xl font-bold text-brand-900">Entre em sua conta</h2>
              <p className="text-gray-500 text-sm mt-2">
                Acesse seu repertório e equipe
              </p>
            </div>

            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>

          <p className="text-center text-gray-400 text-xs mt-6">
            Ao entrar, você concorda com nossos{' '}
            <a href="#" className="text-gold-500 hover:text-gold-600 font-medium transition-colors">
              Termos de Uso
            </a>
            {' '}e{' '}
            <a href="#" className="text-gold-500 hover:text-gold-600 font-medium transition-colors">
              Política de Privacidade
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
