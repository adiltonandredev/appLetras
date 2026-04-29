'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@rl/utils';
import { Plus, Edit2, Trash2, GripVertical, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';

interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  icon?: string;
}

interface Props {
  categories: Category[];
}

interface EditState {
  name: string;
  icon: string;
}

const PRESET_ICONS = ['🎵', '✝️', '🕊️', '🙏', '🎶', '🌟', '🕯️', '📖', '❤️', '🌿', '🏛️', '🎼', '🌊', '☀️', '🎹', '🎸'];

export function CategoriesAdminClient({ categories: initial }: Props) {
  const supabase = createClient();
  const [categories, setCategories] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [newCat, setNewCat] = useState<EditState>({ name: '', icon: '🎵' });
  const [editing, setEditing] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: '', icon: '' });
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!newCat.name.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('liturgical_categories')
        .insert({
          name: newCat.name.trim(),
          slug: slugify(newCat.name),
          icon: newCat.icon,
          sort_order: categories.length + 1,
        })
        .select()
        .single();

      if (error) throw error;
      setCategories(prev => [...prev, data]);
      setNewCat({ name: '', icon: '🎵' });
      setCreating(false);
      toast.success('Categoria criada.');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editState.name.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('liturgical_categories')
        .update({
          name: editState.name.trim(),
          slug: slugify(editState.name),
          icon: editState.icon,
        })
        .eq('id', id);

      if (error) throw error;
      setCategories(prev => prev.map(c =>
        c.id === id ? { ...c, name: editState.name.trim(), icon: editState.icon, slug: slugify(editState.name) } : c
      ));
      setEditing(null);
      toast.success('Categoria atualizada.');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Excluir a categoria "${cat.name}"? Músicas associadas ficarão sem esta categoria.`)) return;
    try {
      const { error } = await supabase
        .from('liturgical_categories')
        .delete()
        .eq('id', cat.id);

      if (error) throw error;
      setCategories(prev => prev.filter(c => c.id !== cat.id));
      toast.success('Categoria excluída.');
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  }

  function startEdit(cat: Category) {
    setEditing(cat.id);
    setEditState({ name: cat.name, icon: cat.icon ?? '🎵' });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setCreating(true)} className="btn-primary" disabled={creating}>
          <Plus className="w-4 h-4" /> Nova categoria
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="card p-5 border-brand-200 border-2">
          <h3 className="font-semibold text-gray-900 mb-4">Nova Categoria</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                autoFocus
                type="text"
                value={newCat.name}
                onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Entrada, Ofertório, Comunhão..."
                className="input w-full"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ícone</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_ICONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setNewCat(p => ({ ...p, icon }))}
                    className={clsx(
                      'w-9 h-9 rounded-lg text-xl flex items-center justify-center border-2 transition-colors',
                      newCat.icon === icon
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-transparent hover:border-gray-200'
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={handleCreate} disabled={saving || !newCat.name.trim()} className="btn-primary">
              <Check className="w-4 h-4" /> {saving ? 'Salvando...' : 'Criar'}
            </button>
            <button onClick={() => setCreating(false)} className="btn-ghost">
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Categories list */}
      <div className="card overflow-hidden">
        {categories.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">Nenhuma categoria cadastrada.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {categories.map(cat => (
              <div key={cat.id} className="p-4">
                {editing === cat.id ? (
                  /* Edit mode */
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_ICONS.map(icon => (
                          <button
                            key={icon}
                            onClick={() => setEditState(p => ({ ...p, icon }))}
                            className={clsx(
                              'w-8 h-8 rounded-lg text-lg flex items-center justify-center border-2 transition-colors',
                              editState.icon === icon
                                ? 'border-brand-500 bg-brand-50'
                                : 'border-transparent hover:border-gray-200'
                            )}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        autoFocus
                        type="text"
                        value={editState.name}
                        onChange={e => setEditState(p => ({ ...p, name: e.target.value }))}
                        className="input flex-1"
                        onKeyDown={e => e.key === 'Enter' && handleUpdate(cat.id)}
                      />
                      <button
                        onClick={() => handleUpdate(cat.id)}
                        disabled={saving}
                        className="btn-primary"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="btn-ghost"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-300 shrink-0 cursor-grab" />
                    <span className="text-xl">{cat.icon ?? '🎵'}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{cat.slug}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
