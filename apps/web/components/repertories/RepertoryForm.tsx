'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createClient } from '@/lib/supabase/client';
import { createRepertory, updateRepertory, reorderRepertoryItems, addRepertoryItem, removeRepertoryItem } from '@rl/api-client';
import { KEY_NOTES } from '@rl/utils';
import type { Repertory, Song, CelebrationType } from '@rl/types';
import {
  GripVertical, Plus, X, Search, Save, Loader2,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';

const schema = z.object({
  title: z.string().min(2, 'Título muito curto').max(200),
  celebration: z.string().optional(),
  event_date: z.string().optional(),
  community: z.string().max(200).optional(),
  observations: z.string().max(1000).optional(),
  is_public: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface RepertoryItem {
  id: string;
  song: Song;
  custom_key?: string;
  observations?: string;
  position: number;
}

interface CelebrationTypeOption {
  slug: string;
  name: string;
  icon: string;
}

interface RepertoryFormProps {
  songs: Song[];
  mode: 'create' | 'edit';
  repertory?: Repertory & { items?: RepertoryItem[] };
}

export function RepertoryForm({ songs, mode, repertory }: RepertoryFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [celebrationTypes, setCelebrationTypes] = useState<CelebrationTypeOption[]>([]);

  useEffect(() => {
    supabase
      .from('celebration_types')
      .select('slug, name, icon')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => { if (data) setCelebrationTypes(data); });
  }, []);

  const [items, setItems] = useState<RepertoryItem[]>(
    (repertory?.items ?? []).map((i: any, idx) => ({
      id: i.id ?? `temp-${idx}`,
      song: i.song,
      custom_key: i.custom_key,
      observations: i.observations,
      position: i.position ?? idx + 1,
    }))
  );
  const [songSearch, setSongSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: repertory?.title ?? '',
      celebration: repertory?.celebration ?? '',
      event_date: repertory?.event_date ?? '',
      community: repertory?.community ?? '',
      observations: repertory?.observations ?? '',
      is_public: repertory?.is_public ?? false,
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIdx = prev.findIndex(i => i.id === active.id);
      const newIdx = prev.findIndex(i => i.id === over.id);
      return arrayMove(prev, oldIdx, newIdx).map((item, idx) => ({
        ...item,
        position: idx + 1,
      }));
    });
  }

  function addSong(song: Song) {
    if (items.some(i => i.song.id === song.id)) {
      toast.info('Esta música já está no repertório.');
      return;
    }
    setItems(prev => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        song,
        position: prev.length + 1,
      },
    ]);
    setSongSearch('');
  }

  function removeSong(itemId: string) {
    setItems(prev =>
      prev.filter(i => i.id !== itemId).map((item, idx) => ({
        ...item,
        position: idx + 1,
      }))
    );
  }

  function updateItemField(itemId: string, field: 'custom_key' | 'observations', value: string) {
    setItems(prev =>
      prev.map(i => i.id === itemId ? { ...i, [field]: value } : i)
    );
  }

  const filteredSongs = songs.filter(s =>
    !songSearch ||
    s.title.toLowerCase().includes(songSearch.toLowerCase()) ||
    (s.author ?? '').toLowerCase().includes(songSearch.toLowerCase())
  );

  async function onSubmit(data: FormData) {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const payload = {
        title: data.title,
        celebration: (data.celebration as CelebrationType) || undefined,
        event_date: data.event_date || undefined,
        community: data.community || undefined,
        observations: data.observations || undefined,
        is_public: data.is_public ?? false,
      };

      let repId: string;

      if (mode === 'create') {
        const created = await createRepertory(supabase, payload, user.id);
        repId = created.id;

        // Add all items
        for (let i = 0; i < items.length; i++) {
          await addRepertoryItem(supabase, repId, {
            song_id: items[i].song.id,
            position: i + 1,
            custom_key: items[i].custom_key,
            observations: items[i].observations,
          });
        }
      } else {
        repId = repertory!.id;
        await updateRepertory(supabase, repId, payload, user.id);

        // Reorder existing items
        const existingIds = items.filter(i => !i.id.startsWith('temp-')).map(i => ({
          id: i.id,
          position: i.position,
        }));
        if (existingIds.length > 0) {
          await reorderRepertoryItems(supabase, { items: existingIds });
        }
      }

      toast.success(mode === 'create' ? 'Repertório criado!' : 'Repertório atualizado!');
      router.push(`/repertorios/${repId}`);
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Meta */}
      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Informações</h2>

        <div>
          <label className="label">Título *</label>
          <input {...register('title')} className="input" placeholder="Ex: Missa Dominical — 27/04/2026" />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Tipo de Celebração</label>
            <select {...register('celebration')} className="input">
              <option value="">Selecionar...</option>
              {celebrationTypes.map(ct => (
                <option key={ct.slug} value={ct.slug}>
                  {ct.icon} {ct.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Data do Evento</label>
            <input {...register('event_date')} type="date" className="input" />
          </div>
        </div>

        <div>
          <label className="label">Comunidade / Paróquia</label>
          <input {...register('community')} className="input" placeholder="Ex: Paróquia São João" />
        </div>

        <div>
          <label className="label">Observações gerais</label>
          <textarea {...register('observations')} rows={2} className="input resize-none" placeholder="Avisos, informações para a equipe..." />
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input {...register('is_public')} type="checkbox" className="w-4 h-4 rounded accent-brand-600" />
          <span className="text-sm text-gray-700">Tornar repertório visível para todos da equipe</span>
        </label>
      </div>

      {/* Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Song picker */}
        <div className="lg:col-span-2 card p-4 space-y-3 self-start">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Adicionar Músicas
          </h2>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              value={songSearch}
              onChange={e => setSongSearch(e.target.value)}
              placeholder="Buscar música..."
              className="input pl-9 text-sm"
            />
          </div>

          <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
            {filteredSongs.slice(0, 40).map(song => (
              <button
                key={song.id}
                type="button"
                onClick={() => addSong(song)}
                className={clsx(
                  'w-full flex items-center justify-between p-3 rounded-xl text-left text-sm transition-colors',
                  items.some(i => i.song.id === song.id)
                    ? 'bg-brand-50 text-brand-700 cursor-default'
                    : 'hover:bg-gray-50 text-gray-700'
                )}
              >
                <div>
                  <p className="font-medium truncate max-w-[160px]">{song.title}</p>
                  {song.author && <p className="text-xs text-gray-400">{song.author}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {song.key_note && (
                    <span className="text-xs text-gray-400 font-mono">{song.key_note}</span>
                  )}
                  {items.some(i => i.song.id === song.id)
                    ? <span className="text-xs text-brand-500">✓</span>
                    : <Plus className="w-4 h-4 text-gray-400" />
                  }
                </div>
              </button>
            ))}
            {filteredSongs.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">Nenhuma música encontrada.</p>
            )}
          </div>
        </div>

        {/* Sequence */}
        <div className="lg:col-span-3 card overflow-hidden self-start">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Sequência do Repertório
            </h2>
            <span className="badge bg-brand-50 text-brand-700">{items.length} músicas</span>
          </div>

          {items.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-400 text-sm">Adicione músicas da lista ao lado.</p>
              <p className="text-gray-300 text-xs mt-1">Arraste para reordenar.</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map(i => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="divide-y divide-gray-50">
                  {items.map((item, idx) => (
                    <SortableRepertoryItem
                      key={item.id}
                      item={item}
                      index={idx}
                      isEditing={editingItem === item.id}
                      onToggleEdit={() => setEditingItem(editingItem === item.id ? null : item.id)}
                      onRemove={() => removeSong(item.id)}
                      onChangeKey={(v) => updateItemField(item.id, 'custom_key', v)}
                      onChangeObs={(v) => updateItemField(item.id, 'observations', v)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="btn-primary px-6">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {mode === 'create' ? 'Criar repertório' : 'Salvar alterações'}
        </button>
      </div>
    </form>
  );
}

// ─── Sortable item ────────────────────────────────────────────────────────────
function SortableRepertoryItem({
  item, index, isEditing, onToggleEdit, onRemove, onChangeKey, onChangeObs,
}: {
  item: RepertoryItem;
  index: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  onRemove: () => void;
  onChangeKey: (v: string) => void;
  onChangeObs: (v: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx('group', isDragging && 'opacity-50 bg-brand-50 z-50')}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 p-1 -ml-1"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Position */}
        <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>

        {/* Song */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{item.song.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {item.song.author && (
              <span className="text-xs text-gray-400">{item.song.author}</span>
            )}
            {(item.custom_key || item.song.key_note) && (
              <span className="text-xs font-mono text-brand-600">
                {item.custom_key ?? item.song.key_note}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onToggleEdit}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            {isEditing ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inline edit */}
      {isEditing && (
        <div className="px-4 pb-4 pt-1 grid grid-cols-2 gap-3 bg-gray-50 border-t border-gray-100">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Tom customizado</label>
            <select
              value={item.custom_key ?? ''}
              onChange={e => onChangeKey(e.target.value)}
              className="input text-sm py-1.5"
            >
              <option value="">Padrão ({item.song.key_note ?? '—'})</option>
              {KEY_NOTES.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Observação</label>
            <input
              type="text"
              value={item.observations ?? ''}
              onChange={e => onChangeObs(e.target.value)}
              placeholder="Ex: intro 2x"
              className="input text-sm py-1.5"
            />
          </div>
        </div>
      )}
    </div>
  );
}
