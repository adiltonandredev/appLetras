import type { Metadata } from 'next';
import Link from 'next/link';
import { RecuperarSenhaForm } from '@/components/auth/RecuperarSenhaForm';

export const metadata: Metadata = { title: 'Recuperar Senha — Repertório Litúrgico' };

export default function RecuperarSenhaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-2xl">🎵</span>
          <span className="font-bold text-gray-900">Repertório Litúrgico</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Recuperar senha</h1>
        <p className="text-gray-500 text-sm mb-6">
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
        </p>

        <RecuperarSenhaForm />

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/login" className="text-brand-600 hover:underline font-medium">
            ← Voltar para o login
          </Link>
        </p>
      </div>
    </div>
  );
}
