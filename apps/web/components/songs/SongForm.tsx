'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { createSong, updateSong } from '@rl/api-client';
import { KEY_NOTES } from '@rl/utils';
import type { LiturgicalCategory, Song } from '@rl/types';
import { Save, Send, Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  title: z.string().min(2, 'Título muito curto').max(200),
  subtitle: z.string().max(200).optional(),
  author: z.string().max(200).optional(),
  composer: z.string().max(200).optional(),
  lyrics: z.string().min(10, 'Letra muito curta'),
  chords: z.string().optional(),
  key_note: z.string().optional(),
  bpm: z.coerce.number().min(20).max(300).optional().or(z.literal('')),
  observations: z.string().max(1000).optional(),
  category_ids: z.array(z.number()).optional(),
  tags: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof schema>;

interface SongFormProps {
  categories: LiturgicalCategory[];
  mode: 'create' | 'edit';
  song?: Song;
}

export function SongForm({ categories, mode, song }: SongFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [tagInput, setTagInput] = useState('');
  const [activeTab, setActiveTab] = useState<'lyrics' | 'chords'>('lyrics');

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: song?.title ?? '',
      subtitle: song?.subtitle ?? '',
      author: song?.author ?? '',
      composer: song?.composer ?? '',
      lyrics: song?.lyrics ?? '',
      chords: song?.chords ?? '',
      key_note: song?.key_note ?? '',
      bpm: song?.bpm ?? undefined,
      observations: song?.observations ?? '',
      category_ids: song?.categories?.map(c => c.id) ?? [],
      tags: song?.tags ?? [],
    },
  });

  const tags = watch('tags') ?? [];
  const selectedCategories = watch('category_ids') ?? [];

  function addTag() {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setValue('tags', [...tags, trimmed]);
    }
    setTagInput('');
  }

  function removeTag(tag: string) {
    setValue('tags', tags.filter(t => t !== tag));
  }

  function toggleCategory(id: number) {
    if (selectedCategories.includes(id)) {
      setValue('category_ids', selectedCategories.filter(c => c !== id));
    } else {
      setValue('category_ids', [...selectedCategories, id]);
    }
  }

  async function onSubmit(data: FormData, submitForReview = false) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        ...data,
        bpm: data.bpm === '' ? undefined : Number(data.bpm),
      };

      if (mode === 'create') {
        const created = await createSong(supabase, payload, user.id);
        if (submitForReview) {
          await supabase.from('songs').update({ status: 'pending' }).eq('id', created.id);
          toast.success('Música enviada para aprovação!');
        } else {
          toast.success('Música salva como rascunho!');
        }
        router.push(`/musicas/${created.id}`);
      } else if (song) {
        await updateSong(supabase, song.id, payload, user.id);
        toast.success('Música atualizada!');
        router.push(`/musicas/${song.id}`);
      }
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit((d) => onSubmit(d, false))}>

      {/* Basic info */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide text-gray-400">
          Informações Básicas
        </h2>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="label">Título *</label>
            <input {...register('title')} className="input" placeholder="Ex: Senhor, Tem Piedade" />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="label">Subtítulo</label>
            <input {...register('subtitle')} className="input" placeholder="Ex: Kyrie" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Autor / Intérprete</label>
              <input {...register('author')} className="input" placeholder="Ex: Comunidade Shalom" />
            </div>
            <div>
              <label className="label">Compositor</label>
              <input {...register('composer')} className="input" placeholder="Ex: Pe. Zezinho" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tom</label>
              <select {...register('key_note')} className="input">
                <option value="">Selecionar tom</option>
                {KEY_NOTES.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="label">BPM</label>
              <input {...register('bpm')} type="number" min="20" max="300" className="input" placeholder="Ex: 72" />
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="card p-6 space-y-3">
        <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide text-gray-400">
          Categorias Litúrgicas
        </h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const selected = selectedCategories.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`badge text-xs py-1.5 px-3 cursor-pointer transition-colors ${
                  selected
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lyrics / Chords */}
      <div className="card p-6 space-y-3">
        <div className="flex items-center gap-1 border-b border-gray-100 pb-3">
          {(['lyrics', 'chords'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'lyrics' ? 'Letra *' : 'Cifra (opcional)'}
            </button>
          ))}
        </div>

        {activeTab === 'lyrics' && (
          <div>
            <textarea
              {...register('lyrics')}
              rows={14}
              className="input font-mono text-sm resize-none"
              placeholder="Cole ou digite a letra aqui..."
            />
            {errors.lyrics && <p className="text-red-500 text-xs mt-1">{errors.lyrics.message}</p>}
          </div>
        )}

        {activeTab === 'chords' && (
          <textarea
            {...register('chords')}
            rows={14}
            className="input font-mono text-sm resize-none"
            placeholder="Cole ou digite a cifra aqui..."
          />
        )}
      </div>

      {/* Tags */}
      <div className="card p-6 space-y-3">
        <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide text-gray-400">Tags</h2>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            className="input flex-1"
            placeholder="Ex: advento, natal, páscoa"
          />
          <button type="button" onClick={addTag} className="btn-secondary px-3">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span key={tag} className="badge bg-brand-50 text-brand-700 gap-1.5">
                {tag}
                <button type="button" onClick={() => removeTag(tag)}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Observations */}
      <div className="card p-6 space-y-3">
        <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide text-gray-400">Observações</h2>
        <textarea
          {...register('observations')}
          rows={3}
          className="input resize-none"
          placeholder="Informações adicionais para a equipe..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-secondary"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar rascunho
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit((d) => onSubmit(d, true))}
          className="btn-primary"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Enviar para aprovação
        </button>
      </div>
    </form>
  );
}
