import type { Metadata } from 'next';
import Link from 'next/link';
import { RecuperarSenhaForm } from '@/components/auth/RecuperarSenhaForm';
import { SacredBackground } from '@/components/ui/SacredBackground';

export const metadata: Metadata = { title: 'Recuperar Senha — APPLetras' };

export default function RecuperarSenhaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sacred-bg p-6 relative">
      <SacredBackground variant="light" opacity={0.03} />

      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="w-14 h-14 bg-gradient-to-br from-gold-300 to-gold-500 rounded-2xl flex items-center justify-center border-2 border-gold-200">
            <svg className="w-8 h-8 text-brand-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <span className="font-serif font-black text-brand-900 text-2xl">APPLetras</span>
        </div>

        <h1 className="font-serif text-3xl font-bold text-brand-900 mb-2">Recuperar senha</h1>
        <p className="text-gray-500 text-sm mb-8">
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
        </p>

        <RecuperarSenhaForm />

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/login" className="text-gold-500 hover:text-gold-600 font-medium transition-colors">
            ← Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
