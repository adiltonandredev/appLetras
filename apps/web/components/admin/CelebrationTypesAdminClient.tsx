'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, Edit2, Trash2, Check, X, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { clsx } from 'clsx';

interface CelebrationType {
  id: string;
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

interface Props {
  types: CelebrationType[];
}

const PRESET_ICONS = [
  '⛪', '🙌', '🙏', '👥', '📋', '🎵', '✝️', '🕊️', '🎶', '🌟',
  '🕯️', '📖', '❤️', '🌿', '🏛️', '🎼', '☀️', '🌊', '🎹', '🎸',
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function CelebrationTypesAdminClient({ types: initial }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [types, setTypes] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [newType, setNewType] = useState({ name: '', icon: '🎵' });
  const [editing, setEditing] = useState<string | null>(null);
  const [editState, setEditState] = useState({ name: '', icon: '' });
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!newType.name.trim()) return;
    setSaving(true);
    try {
      const slug = slugify(newType.name);
      const { data, error } = await supabase
        .from('celebration_types')
        .insert({
          name: newType.name.trim(),
          slug,
          icon: newType.icon,
          sort_order: types.length + 1,
        })
        .select()
        .single();

      if (error) throw error;
      setTypes(prev => [...prev, data]);
      setNewType({ name: '', icon: '🎵' });
      setCreating(false);
      toast.success('Tipo de celebração criado.');
      router.refresh();
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
      const slug = slugify(editState.name);
      const { error } = await supabase
        .from('celebration_types')
        .update({ name: editState.name.trim(), slug, icon: editState.icon })
        .eq('id', id);

      if (error) throw error;
      setTypes(prev => prev.map(t =>
        t.id === id ? { ...t, name: editState.name.trim(), slug, icon: editState.icon } : t
      ));
      setEditing(null);
      toast.success('Tipo atualizado.');
      router.refresh();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(type: CelebrationType) {
    try {
      const { error } = await supabase
        .from('celebration_types')
        .update({ is_active: !type.is_active })
        .eq('id', type.id);

      if (error) throw error;
      setTypes(prev => prev.map(t =>
        t.id === type.id ? { ...t, is_active: !t.is_active } : t
      ));
      toast.success(type.is_active ? 'Tipo desativado.' : 'Tipo ativado.');
      router.refresh();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  }

  async function handleDelete(type: CelebrationType) {
    if (!confirm(`Excluir o tipo "${type.name}"? Repertórios que usam este tipo não serão afetados.`)) return;
    try {
      const { error } = await supabase
        .from('celebration_types')
        .delete()
        .eq('id', type.id);

      if (error) throw error;
      setTypes(prev => prev.filter(t => t.id !== type.id));
      toast.success('Tipo excluído.');
      router.refresh();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    }
  }

  function startEdit(type: CelebrationType) {
    setEditing(type.id);
    setEditState({ name: type.name, icon: type.icon });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setCreating(true)}
          disabled={creating}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> Novo tipo
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="card p-5 border-2 border-brand-200">
          <h3 className="font-semibold text-gray-900 mb-4">Novo Tipo de Celebração</h3>
          <div className="space-y-3">
            <div>
              <label className="label">Nome</label>
              <input
                autoFocus
                type="text"
                value={newType.name}
                onChange={e => setNewType(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Semana Santa, Novena, Batizado..."
                className="input w-full"
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
              {newType.name && (
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  slug: {slugify(newType.name)}
                </p>
              )}
            </div>

            <div>
              <label className="label">Ícone</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {PRESET_ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewType(p => ({ ...p, icon }))}
                    className={clsx(
                      'w-9 h-9 rounded-lg text-xl flex items-center justify-center border-2 transition-colors',
                      newType.icon === icon
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
            <button
              onClick={handleCreate}
              disabled={saving || !newType.name.trim()}
              className="btn-primary"
            >
              <Check className="w-4 h-4" /> {saving ? 'Salvando...' : 'Criar'}
            </button>
            <button onClick={() => { setCreating(false); setNewType({ name: '', icon: '🎵' }); }} className="btn-ghost">
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="card overflow-hidden">
        {types.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">Nenhum tipo cadastrado.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {types.map(type => (
              <div key={type.id} className="p-4">
                {editing === type.id ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_ICONS.map(icon => (
                        <button
                          key={icon}
                          type="button"
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
                    <div className="flex gap-2 items-center">
                      <input
                        autoFocus
                        type="text"
                        value={editState.name}
                        onChange={e => setEditState(p => ({ ...p, name: e.target.value }))}
                        className="input flex-1"
                        onKeyDown={e => e.key === 'Enter' && handleUpdate(type.id)}
                      />
                      <button
                        onClick={() => handleUpdate(type.id)}
                        disabled={saving}
                        className="btn-primary"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditing(null)} className="btn-ghost">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                    <span className="text-xl">{type.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={clsx(
                        'text-sm font-medium',
                        type.is_active ? 'text-gray-900' : 'text-gray-400 line-through'
                      )}>
                        {type.name}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">{type.slug}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleActive(type)}
                        className={clsx(
                          'p-1.5 rounded-lg transition-colors',
                          type.is_active
                            ? 'text-green-500 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-50'
                        )}
                        title={type.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {type.is_active
                          ? <ToggleRight className="w-4 h-4" />
                          : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => startEdit(type)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(type)}
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

      <p className="text-xs text-gray-400">
        Tipos desativados não aparecem na seleção ao criar repertórios.
        Repertórios já criados não são afetados.
      </p>
    </div>
  );
}
