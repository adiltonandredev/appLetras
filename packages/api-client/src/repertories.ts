import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Repertory, RepertoryItem, RepertoryFilters, PaginatedResponse,
  CreateRepertoryPayload, UpdateRepertoryPayload,
  AddRepertoryItemPayload, ReorderRepertoryPayload, ShareRepertoryPayload,
} from '@rl/types';

export async function getRepertories(
  client: SupabaseClient,
  userId: string,
  filters: RepertoryFilters = {}
): Promise<PaginatedResponse<Repertory>> {
  const { page = 1, per_page = 20, q, celebration, event_date_from, event_date_to } = filters;
  const from = (page - 1) * per_page;
  const to = from + per_page - 1;

  let query = client
    .from('repertories')
    .select(`*, creator:users!created_by(id, full_name, avatar_url)`, { count: 'exact' })
    .or(`created_by.eq.${userId},is_public.eq.true`)
    .range(from, to)
    .order('event_date', { ascending: false });

  if (q) query = query.ilike('title', `%${q}%`);
  if (celebration) query = query.eq('celebration', celebration);
  if (event_date_from) query = query.gte('event_date', event_date_from);
  if (event_date_to) query = query.lte('event_date', event_date_to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: data ?? [],
    count: count ?? 0,
    page,
    per_page,
    total_pages: Math.ceil((count ?? 0) / per_page),
  };
}

export async function getRepertoryById(
  client: SupabaseClient,
  id: string
): Promise<Repertory> {
  const { data, error } = await client
    .from('repertories')
    .select(`
      *,
      creator:users!created_by(id, full_name, avatar_url),
      items:repertory_items(
        *,
        song:songs(
          *,
          categories:song_categories(category:liturgical_categories(*))
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;

  return {
    ...data,
    items: (data.items ?? [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((item: any) => ({
        ...item,
        song: item.song
          ? { ...item.song, categories: item.song.categories?.map((sc: any) => sc.category) ?? [] }
          : null,
      })),
  };
}

export async function createRepertory(
  client: SupabaseClient,
  payload: CreateRepertoryPayload,
  userId: string
): Promise<Repertory> {
  const { data, error } = await client
    .from('repertories')
    .insert({ ...payload, created_by: userId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateRepertory(
  client: SupabaseClient,
  id: string,
  payload: UpdateRepertoryPayload,
  userId: string
): Promise<Repertory> {
  const { data, error } = await client
    .from('repertories')
    .update({ ...payload, updated_by: userId })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRepertory(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('repertories').delete().eq('id', id);
  if (error) throw error;
}

export async function addRepertoryItem(
  client: SupabaseClient,
  repertoryId: string,
  payload: AddRepertoryItemPayload
): Promise<RepertoryItem> {
  // Get current max position
  const { data: last } = await client
    .from('repertory_items')
    .select('position')
    .eq('repertory_id', repertoryId)
    .order('position', { ascending: false })
    .limit(1)
    .single();

  const position = payload.position ?? (last?.position ?? 0) + 1;

  const { data, error } = await client
    .from('repertory_items')
    .insert({ ...payload, repertory_id: repertoryId, position })
    .select(`*, song:songs(*, categories:song_categories(category:liturgical_categories(*)))`)
    .single();

  if (error) throw error;
  return {
    ...data,
    song: data.song
      ? { ...data.song, categories: data.song.categories?.map((sc: any) => sc.category) ?? [] }
      : null,
  };
}

export async function updateRepertoryItem(
  client: SupabaseClient,
  itemId: string,
  payload: Partial<AddRepertoryItemPayload>
): Promise<RepertoryItem> {
  const { data, error } = await client
    .from('repertory_items')
    .update(payload)
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeRepertoryItem(client: SupabaseClient, itemId: string): Promise<void> {
  const { error } = await client.from('repertory_items').delete().eq('id', itemId);
  if (error) throw error;
}

export async function reorderRepertoryItems(
  client: SupabaseClient,
  payload: ReorderRepertoryPayload
): Promise<void> {
  const updates = payload.items.map(({ id, position }) =>
    client.from('repertory_items').update({ position }).eq('id', id)
  );
  await Promise.all(updates);
}

export async function duplicateRepertory(
  client: SupabaseClient,
  id: string,
  userId: string
): Promise<Repertory> {
  const original = await getRepertoryById(client, id);

  const { data: copy, error } = await client
    .from('repertories')
    .insert({
      title: `${original.title} (cópia)`,
      celebration: original.celebration,
      event_date: original.event_date,
      community: original.community,
      observations: original.observations,
      is_public: false,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  if (original.items?.length) {
    const { error: itemsError } = await client.from('repertory_items').insert(
      original.items.map(item => ({
        repertory_id: copy.id,
        song_id: item.song_id,
        position: item.position,
        custom_key: item.custom_key,
        observations: item.observations,
      }))
    );
    if (itemsError) throw itemsError;
  }

  return copy;
}

export async function shareRepertory(
  client: SupabaseClient,
  repertoryId: string,
  payload: ShareRepertoryPayload,
  userId: string
): Promise<void> {
  const { error } = await client.from('shared_repertories').insert({
    repertory_id: repertoryId,
    shared_with: payload.shared_with,
    team_id: payload.team_id,
    permission: payload.permission ?? 'view',
    shared_by: userId,
    expires_at: payload.expires_at,
  });
  if (error) throw error;
}
