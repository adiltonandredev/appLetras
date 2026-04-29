import type { SupabaseClient } from '@supabase/supabase-js';
import type { LiturgicalCategory } from '@rl/types';

export async function getCategories(client: SupabaseClient): Promise<LiturgicalCategory[]> {
  const { data, error } = await client
    .from('liturgical_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createCategory(
  client: SupabaseClient,
  payload: Pick<LiturgicalCategory, 'name' | 'slug' | 'description'>,
  userId: string
): Promise<LiturgicalCategory> {
  const { data, error } = await client
    .from('liturgical_categories')
    .insert({ ...payload, is_native: false, created_by: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCategory(
  client: SupabaseClient,
  id: number,
  payload: Partial<Pick<LiturgicalCategory, 'name' | 'description' | 'sort_order'>>
): Promise<LiturgicalCategory> {
  const { data, error } = await client
    .from('liturgical_categories')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCategory(client: SupabaseClient, id: number): Promise<void> {
  const { error } = await client
    .from('liturgical_categories')
    .delete()
    .eq('id', id)
    .eq('is_native', false); // protect native categories

  if (error) throw error;
}

export async function reorderCategories(
  client: SupabaseClient,
  items: { id: number; sort_order: number }[]
): Promise<void> {
  await Promise.all(
    items.map(({ id, sort_order }) =>
      client.from('liturgical_categories').update({ sort_order }).eq('id', id)
    )
  );
}
