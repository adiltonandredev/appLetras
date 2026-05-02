'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { SacredBackground } from '@/components/ui/SacredBackground';

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
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
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => router.push('/musicas'), 2500);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  }

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

        {success ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-50 rounded-full flex items-center justify-center mx-auto border-2 border-green-200">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="font-serif text-lg font-bold text-brand-900">Senha redefinida!</h2>
            <p className="text-sm text-gray-500">Você será redirecionado em instantes…</p>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-3xl font-bold text-brand-900 mb-2">Nova senha</h1>
            <p className="text-gray-500 text-sm mb-8">Digite e confirme sua nova senha.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2.5 border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nova senha</label>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar senha</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="input w-full"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-6"
              >
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
