'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, CheckCircle, Mail } from 'lucide-react';

export function RecuperarSenhaForm() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/callback?redirect=/redefinir-senha`,
      });

      if (resetError) throw resetError;
      setSent(true);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao enviar e-mail. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">E-mail enviado!</h2>
        <p className="text-sm text-gray-500">
          Verifique a caixa de entrada de <strong>{email}</strong>.
          Clique no link do e-mail para redefinir sua senha.
        </p>
        <p className="text-xs text-gray-400">
          Não recebeu? Verifique a pasta de spam ou{' '}
          <button
            onClick={() => setSent(false)}
            className="text-brand-600 hover:underline"
          >
            tente novamente
          </button>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2.5 border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
        <div className="relative">
          <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="input w-full pl-9"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full"
      >
        {loading ? 'Enviando...' : 'Enviar link de recuperação'}
      </button>
    </form>
  );
}
