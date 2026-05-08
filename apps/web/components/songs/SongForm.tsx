'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { createSong, updateSong, submitSongForReview } from '@rl/api-client';
import { KEY_NOTES } from '@rl/utils';
import type { LiturgicalCategory, Song } from '@rl/types';
import { Save, Send, Loader2, Plus, X, Info } from 'lucide-react';
import { toast } from 'sonner';
import { AutocompleteInput, type Suggestion } from '@/components/ui/AutocompleteInput';

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

const SECTION_MARKERS = [
  { label: '♪ Refrão', value: '[Refrão]', color: 'bg-gold-400/20 text-gold-600 border border-gold-400/40 hover:bg-gold-400/30' },
  { label: 'Estrofe', value: '[Estrofe 1]', color: 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200' },
  { label: 'Ponte', value: '[Ponte]', color: 'bg-purple-100 text-purple-600 border border-purple-200 hover:bg-purple-200' },
  { label: 'Pré-Refrão', value: '[Pré-Refrão]', color: 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100' },
  { label: 'Intro', value: '[Intro]', color: 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200' },
  { label: 'Final', value: '[Final]', color: 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200' },
];

export function SongForm({ categories, mode, song }: SongFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [tagInput, setTagInput] = useState('');
  const [activeTab, setActiveTab] = useState<'lyrics' | 'chords'>('lyrics');
  const [showHint, setShowHint] = useState(false);
  const lyricsRef = useRef<HTMLTextAreaElement | null>(null);

  // ─── Autocomplete state ───────────────────────────────────────
  const [titleSuggestions, setTitleSuggestions] = useState<Suggestion[]>([]);
  const [authorSuggestions, setAuthorSuggestions] = useState<Suggestion[]>([]);
  const [composerSuggestions, setComposerSuggestions] = useState<Suggestion[]>([]);
  const [loadingTitle, setLoadingTitle] = useState(false);
  const [loadingAuthor, setLoadingAuthor] = useState(false);
  const [loadingComposer, setLoadingComposer] = useState(false);

  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function debounce(key: string, fn: () => void, delay = 350) {
    clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(fn, delay);
  }

  const searchTitles = useCallback((q: string) => {
    if (q.trim().length < 2) { setTitleSuggestions([]); return; }
    setLoadingTitle(true);
    debounce('title', async () => {
      const { data } = await supabase
        .from('songs')
        .select('id, title, author, status')
        .ilike('title', `%${q}%`)
        .neq('id', song?.id ?? '00000000-0000-0000-0000-000000000000')
        .limit(6);
      setLoadingTitle(false);
      if (!data) return;
      setTitleSuggestions(data.map(s => ({
        value: s.title,
        sublabel: [s.author, s.status === 'approved' ? '✓ aprovada' : s.status === 'pending' ? '⏳ pendente' : '📝 rascunho'].filter(Boolean).join(' · '),
        href: `/musicas/${s.id}`,
        isDuplicate: true,
      })));
    });
  }, [supabase, song?.id]);

  const searchAuthors = useCallback((q: string) => {
    if (q.trim().length < 2) { setAuthorSuggestions([]); return; }
    setLoadingAuthor(true);
    debounce('author', async () => {
      const { data } = await supabase
        .from('songs')
        .select('author')
        .ilike('author', `%${q}%`)
        .not('author', 'is', null)
        .limit(20);
      setLoadingAuthor(false);
      if (!data) return;
      const unique = [...new Set(data.map(s => s.author).filter(Boolean))] as string[];
      setAuthorSuggestions(unique.slice(0, 6).map(v => ({ value: v })));
    });
  }, [supabase]);

  const searchComposers = useCallback((q: string) => {
    if (q.trim().length < 2) { setComposerSuggestions([]); return; }
    setLoadingComposer(true);
    debounce('composer', async () => {
      const { data } = await supabase
        .from('songs')
        .select('composer')
        .ilike('composer', `%${q}%`)
        .not('composer', 'is', null)
        .limit(20);
      setLoadingComposer(false);
      if (!data) return;
      const unique = [...new Set(data.map(s => s.composer).filter(Boolean))] as string[];
      setComposerSuggestions(unique.slice(0, 6).map(v => ({ value: v })));
    });
  }, [supabase]);

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

  const { ref: lyricsFormRef, ...lyricsRest } = register('lyrics');

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

  function insertMarker(marker: string) {
    const textarea = lyricsRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;

    // Add newline before marker if not at the beginning
    const prefix = start > 0 && current[start - 1] !== '\n' ? '\n' : '';
    const suffix = '\n';

    const newValue = current.slice(0, start) + prefix + marker + suffix + current.slice(end);
    setValue('lyrics', newValue, { shouldValidate: true });

    // Restore focus and set cursor after the inserted marker
    setTimeout(() => {
      textarea.focus();
      const newPos = start + prefix.length + marker.length + suffix.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
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
          // Usa submitSongForReview que atualiza songs.status E cria o registro em song_approvals
          await submitSongForReview(supabase, created.id, user.id);
          toast.success('Música enviada para aprovação!');
        } else {
          toast.success('Música salva como rascunho!');
        }
        router.push(`/musicas/${created.id}`);
      } else if (song) {
        await updateSong(supabase, song.id, payload, user.id);
        if (submitForReview) {
          // Edição + envio para revisão
          await submitSongForReview(supabase, song.id, user.id);
          toast.success('Música enviada para aprovação!');
        } else {
          toast.success('Música atualizada!');
        }
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
            <AutocompleteInput
              value={watch('title') ?? ''}
              onChange={v => { setValue('title', v, { shouldValidate: true }); searchTitles(v); }}
              suggestions={titleSuggestions}
              loading={loadingTitle}
              placeholder="Ex: Senhor, Tem Piedade"
            />
            {titleSuggestions.length > 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                ⚠️ Músicas com título similar encontradas — verifique antes de criar.
              </p>
            )}
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="label">Subtítulo</label>
            <input {...register('subtitle')} className="input" placeholder="Ex: Kyrie" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Autor / Intérprete</label>
              <AutocompleteInput
                value={watch('author') ?? ''}
                onChange={v => { setValue('author', v); searchAuthors(v); }}
                onSelect={v => setValue('author', v)}
                suggestions={authorSuggestions}
                loading={loadingAuthor}
                placeholder="Ex: Comunidade Shalom"
              />
            </div>
            <div>
              <label className="label">Compositor</label>
              <AutocompleteInput
                value={watch('composer') ?? ''}
                onChange={v => { setValue('composer', v); searchComposers(v); }}
                onSelect={v => setValue('composer', v)}
                suggestions={composerSuggestions}
                loading={loadingComposer}
                placeholder="Ex: Pe. Zezinho"
              />
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
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-400">
            Categorias Litúrgicas
          </h2>
          {selectedCategories.length > 0 && (
            <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
              {selectedCategories.length} selecionada{selectedCategories.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {categories.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Nenhuma categoria cadastrada ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((cat: any) => {
              const selected = selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`flex items-center gap-1.5 text-sm py-2 px-3.5 rounded-xl font-medium cursor-pointer transition-all border ${
                    selected
                      ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400 hover:text-brand-600'
                  }`}
                >
                  {cat.icon && <span className="text-base leading-none">{cat.icon}</span>}
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}
        <p className="text-xs text-gray-400">Selecione uma ou mais categorias para classificar a música.</p>
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
          <div className="space-y-2">
            {/* Section marker buttons */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 font-medium shrink-0">Inserir seção:</span>
                {SECTION_MARKERS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => insertMarker(m.value)}
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-colors ${m.color}`}
                  >
                    {m.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowHint(h => !h)}
                  className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
                  title="Como funciona?"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              {showHint && (
                <div className="bg-brand-50 border border-brand-100 rounded-lg p-3 text-xs text-brand-800 space-y-1">
                  <p className="font-semibold">Como funciona a formatação de seções:</p>
                  <p>Clique nos botões acima para inserir marcadores de seção (ex: <code className="bg-white px-1 rounded">[Refrão]</code>) antes de cada parte da música.</p>
                  <p>Na visualização, o <strong>Refrão aparece em negrito</strong> com destaque dourado, estrofes em texto normal e pontes em itálico.</p>
                  <p className="text-brand-600">Dica: posicione o cursor no local desejado antes de clicar no botão de seção.</p>
                </div>
              )}
            </div>

            <textarea
              {...lyricsRest}
              ref={(el) => {
                lyricsFormRef(el);
                lyricsRef.current = el;
              }}
              rows={16}
              className="input font-mono text-sm resize-none"
              placeholder={"[Estrofe 1]\nCole ou digite a letra aqui...\n\n[Refrão]\nO refrão aparecerá em negrito na visualização..."}
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
