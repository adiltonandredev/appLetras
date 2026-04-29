'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export function RegistroForm() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });

      if (signUpError) throw signUpError;
      setSuccess(true);
    } catch (err: any) {
      setError(
        err.message === 'User already registered'
          ? 'Este e-mail já está cadastrado. Tente fazer login.'
          : err.message ?? 'Erro ao criar conta.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Verifique seu e-mail</h2>
        <p className="text-sm text-gray-500">
          Enviamos um link de confirmação para <strong>{email}</strong>.
          Clique nele para ativar sua conta e acessar o sistema.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="btn-primary w-full"
        >
          Ir para o login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Google OAuth */}
      <button
        type="button"
        onClick={() => supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${location.origin}/auth/callback` },
        })}
        className="w-full flex items-center justify-center gap-3 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2a10.3 10.3 0 0 0-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91a8.78 8.78 0 0 0 2.69-6.62Z" />
          <path fill="#34A853" d="M9 18a8.6 8.6 0 0 0 5.95-2.18l-2.91-2.26A5.43 5.43 0 0 1 9 14.57a5.38 5.38 0 0 1-5.07-3.71H.96v2.33A9 9 0 0 0 9 18Z" />
          <path fill="#FBBC05" d="M3.93 10.86A5.4 5.4 0 0 1 3.65 9a5.4 5.4 0 0 1 .28-1.86V4.81H.96a9 9 0 0 0 0 8.38Z" />
          <path fill="#EA4335" d="M9 3.58a4.86 4.86 0 0 1 3.44 1.35l2.58-2.58A8.63 8.63 0 0 0 9 0a9 9 0 0 0-8.04 4.81l2.97 2.33A5.38 5.38 0 0 1 9 3.58Z" />
        </svg>
        Continuar com Google
      </button>

      <div className="relative flex items-center">
        <div className="flex-1 border-t border-gray-200" />
        <span className="px-3 text-xs text-gray-400">ou</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2.5 border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
        <input
          type="text"
          required
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          placeholder="Seu nome"
          className="input w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="input w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="input w-full pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Password strength hint */}
        {password.length > 0 && (
          <div className="mt-1.5 flex gap-1">
            {[8, 12, 16].map((len, i) => (
              <div
                key={len}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  password.length >= len
                    ? i === 0 ? 'bg-red-400' : i === 1 ? 'bg-yellow-400' : 'bg-green-400'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full"
      >
        {loading ? 'Criando conta...' : 'Criar conta'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Ao criar uma conta, você concorda com nossos termos de uso e política de privacidade.
      </p>
    </form>
  );
}
