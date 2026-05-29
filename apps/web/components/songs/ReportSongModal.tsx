'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { X, Flag, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const REASONS = [
  { value: 'wrong_lyrics',  label: '🎵 Letra incorreta ou incompleta' },
  { value: 'wrong_info',    label: '✏️ Informações erradas (título, autor, tom)' },
  { value: 'duplicate',     label: '🔁 Música duplicada' },
  { value: 'copyright',     label: '⚠️ Problema de direitos autorais' },
  { value: 'other',         label: '💬 Outro motivo' },
];

interface Props {
  songId: string;
  songTitle: string;
  userId: string;
  onClose: () => void;
}

export function ReportSongModal({ songId, songTitle, userId, onClose }: Props) {
  const supabase = createClient();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason || !description.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from('song_reports').insert({
        song_id: songId,
        reported_by: userId,
        reason,
        description: description.trim(),
      });
      if (error) throw error;
      setDone(true);
    } catch (err: any) {
      toast.error('Erro ao enviar reporte: ' + err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-900">Reportar problema</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {done ? (
          /* Confirmação */
          <div className="px-6 py-10 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="font-semibold text-gray-900">Reporte enviado!</p>
            <p className="text-sm text-gray-500">
              Obrigado por contribuir. O administrador irá analisar em breve.
            </p>
            <button onClick={onClose} className="btn-primary mt-2">
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <p className="text-sm text-gray-500">
              Encontrou um erro em <span className="font-semibold text-gray-700">"{songTitle}"</span>?
              Descreva o problema para que o administrador possa corrigir.
            </p>

            {/* Motivo */}
            <div>
              <label className="label">Motivo *</label>
              <div className="space-y-2 mt-1">
                {REASONS.map(r => (
                  <label
                    key={r.value}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      reason === r.value
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="accent-amber-500"
                    />
                    <span className="text-sm text-gray-700">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="label">Descreva o problema *</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Ex: A letra do 2º verso está errada, falta a segunda estrofe..."
                className="input resize-none"
                required
              />
              <p className="text-xs text-gray-400 text-right mt-1">{description.length}/1000</p>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={sending || !reason || !description.trim()}
                className="btn-primary flex-1 bg-amber-500 hover:bg-amber-600 border-amber-500 hover:border-amber-600"
              >
                {sending ? 'Enviando…' : 'Enviar reporte'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
