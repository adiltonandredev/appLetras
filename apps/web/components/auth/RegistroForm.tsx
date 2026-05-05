'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export function RegistroForm() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'facebook' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleOAuth(provider: 'google' | 'facebook') {
    setError('');
    setOauthLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        scopes: provider === 'google' ? 'email profile' : 'email',
      },
    });
    if (error) {
      setError('Erro ao conectar com ' + (provider === 'google' ? 'Google' : 'Facebook') + '. Tente novamente.');
      setOauthLoading(null);
    }
  }

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
          ? 'Este e-mail ja esta cadastrado. Tente fazer login.'
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
          Enviamos um link de confirmacao para <strong>{email}</strong>.
          Clique nele para ativar sua conta e acessar o sistema.
        </p>
        <button onClick={() => router.push('/login')} className="btn-primary w-full">
          Ir para o login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* OAuth buttons */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleOAuth('google')}
          disabled={!!oauthLoading || loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {oauthLoading === 'google' ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Continuar com Google
        </button>

        <button
          type="button"
          onClick={() => handleOAuth('facebook')}
          disabled={!!oauthLoading || loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#1877F2] text-white font-medium text-sm hover:bg-[#0D5FD8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {oauthLoading === 'facebook' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          )}
          Continuar com Facebook
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">ou cadastre com e-mail</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm rounded-xl px-3 py-2.5 border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label className="label">Nome completo</label>
        <input
          type="text"
          required
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          placeholder="Seu nome"
          className="input"
        />
      </div>

      <div>
        <label className="label">E-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="input"
        />
      </div>

      <div>
        <label className="label">Senha</label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Minimo 8 caracteres"
            className="input pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {password.length > 0 && (
          <div className="mt-1.5 flex gap-1">
            {[8, 12, 16].map((len, i) => (
              <div key={len} className={`h-1 flex-1 rounded-full transition-colors ${
                password.length >= len
                  ? i === 0 ? 'bg-red-400' : i === 1 ? 'bg-yellow-400' : 'bg-green-400'
                  : 'bg-gray-200'
              }`} />
            ))}
          </div>
        )}
      </div>

      <button type="submit" disabled={loading || !!oauthLoading} className="btn-primary w-full py-3">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
        {loading ? 'Criando conta...' : 'Criar conta'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Ao criar uma conta, voce concorda com nossos termos de uso e politica de privacidade.
      </p>
    </form>
  );
}
