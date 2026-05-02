import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = { title: 'Entrar' };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0D2347 0%, #1B3A6B 50%, #2D5CA6 100%)' }}
      >
        {/* Background texture */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 40px,
              rgba(255,255,255,0.3) 40px,
              rgba(255,255,255,0.3) 41px
            )`,
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">Repertório</p>
            <p className="text-blue-200 text-sm font-medium">Litúrgico</p>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-5xl font-bold text-white leading-tight mb-4">
              Sua música,<br />
              seu ministério,<br />
              <span className="text-gold-400">sua celebração.</span>
            </h1>
            <p className="text-blue-200 text-lg leading-relaxed max-w-md">
              A plataforma completa para equipes de música da Igreja
              organizarem repertórios, gerenciarem letras e celebrarem
              com mais fluidez e organização.
            </p>
          </div>

          {/* Feature bullets */}
          <div className="space-y-4">
            {[
              { icon: '📋', label: 'Repertórios organizados com drag & drop' },
              { icon: '✅', label: 'Fluxo de aprovação de letras' },
              { icon: '📱', label: 'Acesso offline no mobile durante celebrações' },
              { icon: '👥', label: 'Equipe conectada com permissões granulares' },
              { icon: '📄', label: 'Impressão e PDF profissional' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <span className="text-blue-100 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom note */}
        <p className="relative z-10 text-blue-300 text-sm">
          Conteúdo próprio, autorizado ou licenciado.
        </p>
      </div>

      {/* ── Right panel ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg leading-none">Repertório</p>
              <p className="text-brand-600 text-sm font-medium">Litúrgico</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-modal border border-gray-100 p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Entre na sua conta</h2>
              <p className="text-gray-500 text-sm mt-1">
                Acesse seu repertório e equipe
              </p>
            </div>

            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>

          <p className="text-center text-gray-400 text-xs mt-6">
            Ao entrar, você concorda com nossos{' '}
            <a href="#" className="text-brand-600 hover:underline">Termos de Uso</a>
            {' '}e{' '}
            <a href="#" className="text-brand-600 hover:underline">Política de Privacidade</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
