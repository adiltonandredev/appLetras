'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, AlertCircle, CheckCircle, Loader2, KeyRound } from 'lucide-react';
import { SacredBackground } from '@/components/ui/SacredBackground';
import Link from 'next/link';

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const supabase = createClient();

  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Aguarda o Supabase processar o token (pode vir via hash ou código já trocado)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
        setChecking(false);
      } else {
        setChecking(false);
      }
    });

    // Escuta mudança de sessão (quando o token é processado via hash)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setSessionReady(true);
        setChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 3000);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  }

  const Logo = () => (
    <div className="flex flex-col items-center gap-3 mb-10">
      <div className="w-14 h-14 bg-gradient-to-br from-gold-300 to-gold-500 rounded-2xl flex items-center justify-center border-2 border-gold-200 shadow-lg">
        <svg className="w-8 h-8 text-brand-900" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      </div>
      <span className="font-serif font-black text-brand-900 text-2xl">APPLetras</span>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-sacred-bg p-6 relative">
      <SacredBackground variant="light" opacity={0.03} />

      <div className="w-full max-w-sm relative z-10">
        <Logo />

        {/* Verificando sessão */}
        {checking && (
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto" />
            <p className="text-sm text-gray-500">Verificando link de recuperação…</p>
          </div>
        )}

        {/* Link inválido ou expirado */}
        {!checking && !sessionReady && !success && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto border-2 border-red-100">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="font-serif text-xl font-bold text-brand-900">Link inválido ou expirado</h2>
            <p className="text-sm text-gray-500">
              O link de recuperação de senha expirou ou já foi utilizado.
              Solicite um novo link abaixo.
            </p>
            <Link href="/recuperar-senha" className="btn-primary inline-flex">
              Solicitar novo link
            </Link>
          </div>
        )}

        {/* Sucesso */}
        {success && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-200">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="font-serif text-xl font-bold text-brand-900">Senha redefinida!</h2>
            <p className="text-sm text-gray-500">
              Sua senha foi atualizada com sucesso.
              Você será redirecionado em instantes…
            </p>
            <Loader2 className="w-5 h-5 text-brand-400 animate-spin mx-auto" />
          </div>
        )}

        {/* Formulário */}
        {!checking && sessionReady && !success && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h1 className="font-serif text-2xl font-bold text-brand-900">Nova senha</h1>
                <p className="text-gray-500 text-xs">Escolha uma senha segura</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nova senha
                </label>
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
                {/* Força da senha */}
                {password && (
                  <div className="mt-1.5 flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i < (password.length >= 12 ? 4 : password.length >= 10 ? 3 : password.length >= 8 ? 2 : 1)
                            ? password.length >= 12 ? 'bg-emerald-500'
                              : password.length >= 10 ? 'bg-blue-500'
                              : password.length >= 8 ? 'bg-amber-500'
                              : 'bg-red-400'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                    <span className="text-xs text-gray-400 ml-1">
                      {password.length >= 12 ? 'Forte' : password.length >= 10 ? 'Boa' : password.length >= 8 ? 'Fraca' : 'Muito fraca'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirmar senha
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repita a nova senha"
                  className={`input w-full ${confirm && confirm !== password ? 'border-red-300' : confirm && confirm === password ? 'border-emerald-400' : ''}`}
                />
                {confirm && confirm !== password && (
                  <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !password || !confirm || password !== confirm}
                className="btn-primary w-full mt-2"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
                  : 'Salvar nova senha'
                }
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
