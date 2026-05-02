import type { Metadata } from 'next';
import Link from 'next/link';
import { RegistroForm } from '@/components/auth/RegistroForm';
import { SacredBackground } from '@/components/ui/SacredBackground';

export const metadata: Metadata = { title: 'Criar conta — APPLetras' };

export default function RegistroPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel: Sacro Moderno */}
      <div
        className="hidden lg:flex lg:w-[55%] p-12 flex-col justify-between relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0D2347 0%, #1B3A6B 50%, #142C52 100%)' }}
      >
        <SacredBackground variant="dark" opacity={0.08} />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 bg-gradient-to-br from-gold-300 to-gold-500 rounded-2xl flex items-center justify-center border-2 border-gold-200">
              <svg className="w-7 h-7 text-brand-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <span className="text-white font-serif font-black text-2xl">APPLetras</span>
          </div>

          <h2 className="text-white font-serif text-5xl font-black leading-tight mb-4">
            Faça parte da<br />nossa comunidade
          </h2>
          <p className="text-blue-100 text-lg font-light">
            Organize, compartilhe e celebre com a sua equipe de música.
          </p>
        </div>

        <div className="space-y-4 relative z-10">
          {[
            { icon: '🎼', text: 'Acervo colaborativo de músicas litúrgicas' },
            { icon: '📅', text: 'Repertórios organizados para cada celebração' },
            { icon: '📱', text: 'Acesso offline no celular durante as missas' },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-3 text-blue-100">
              <span className="text-2xl">{f.icon}</span>
              <span className="text-sm">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel: Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-sacred-bg relative">
        <SacredBackground variant="light" opacity={0.03} />

        <div className="w-full max-w-sm relative z-10">
          <div className="lg:hidden flex flex-col items-center gap-3 mb-10">
            <div className="w-14 h-14 bg-gradient-to-br from-gold-300 to-gold-500 rounded-2xl flex items-center justify-center border-2 border-gold-200">
              <svg className="w-8 h-8 text-brand-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <span className="font-serif font-black text-brand-900 text-2xl">APPLetras</span>
          </div>

          <h1 className="font-serif text-3xl font-bold text-brand-900 mb-2">Criar conta</h1>
          <p className="text-gray-500 text-sm mb-8">
            Já tem conta?{' '}
            <Link href="/login" className="text-gold-500 hover:text-gold-600 font-medium transition-colors">
              Entrar aqui
            </Link>
          </p>

          <RegistroForm />
        </div>
      </div>
    </div>
  );
}
