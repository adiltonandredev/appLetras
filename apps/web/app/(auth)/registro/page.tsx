import type { Metadata } from 'next';
import Link from 'next/link';
import { RegistroForm } from '@/components/auth/RegistroForm';

export const metadata: Metadata = { title: 'Criar conta — Repertório Litúrgico' };

export default function RegistroPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-[#1e3a5f] via-[#2a5298] to-[#1a6b4a] p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🎵</span>
            </div>
            <span className="text-white font-bold text-xl">Repertório Litúrgico</span>
          </div>

          <h2 className="text-white text-4xl font-bold leading-tight mb-4">
            Faça parte da<br />nossa comunidade
          </h2>
          <p className="text-white/70 text-lg">
            Organize, compartilhe e celebre com a sua equipe de música.
          </p>
        </div>

        <div className="space-y-4">
          {[
            { icon: '🎼', text: 'Acervo colaborativo de músicas litúrgicas' },
            { icon: '📅', text: 'Repertórios organizados para cada celebração' },
            { icon: '📱', text: 'Acesso offline no celular durante as missas' },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-3 text-white/80">
              <span className="text-xl">{f.icon}</span>
              <span className="text-sm">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <span className="text-2xl">🎵</span>
            <span className="font-bold text-gray-900">Repertório Litúrgico</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Criar conta</h1>
          <p className="text-gray-500 text-sm mb-6">
            Já tem conta?{' '}
            <Link href="/login" className="text-brand-600 hover:underline font-medium">
              Entrar
            </Link>
          </p>

          <RegistroForm />
        </div>
      </div>
    </div>
  );
}
