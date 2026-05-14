import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Song, SongFilters, SongRevision, CreateSongPayload, UpdateSongPayload,
  PaginatedResponse,
} from '@rl/types';

export async function getSongs(
  client: SupabaseClient,
  filters: SongFilters = {}
): Promise<PaginatedResponse<Song>> {
  const { page = 1, per_page = 20, q, status, category_id, key_note, created_by, sort = 'alpha' } = filters;
  const from = (page - 1) * per_page;
  const to = from + per_page - 1;

  const sortMap: Record<string, { column: string; ascending: boolean }> = {
    alpha:   { column: 'title',      ascending: true  },
    recent:  { column: 'created_at', ascending: false },
    oldest:  { column: 'created_at', ascending: true  },
    updated: { column: 'updated_at', ascending: false },
  };
  const { column: orderCol, ascending: orderAsc } = sortMap[sort] ?? sortMap['alpha'];

  // Quando há filtro de categoria, usa INNER JOIN para excluir músicas sem ela
  const categoriesJoin = category_id
    ? 'categories:song_categories!inner(category:liturgical_categories(*))'
    : 'categories:song_categories(category:liturgical_categories(*))';

  let query = client
    .from('songs')
    .select(`*, creator:users!created_by(id, full_name, avatar_url), ${categoriesJoin}`, { count: 'exact' })
    .range(from, to)
    .order(orderCol, { ascending: orderAsc });

  if (status) query = query.eq('status', status);
  if (key_note) query = query.eq('key_note', key_note);
  if (created_by) query = query.eq('created_by', created_by);
  if (q) query = query.ilike('title', `%${q}%`);
  if (category_id) query = query.eq('song_categories.category_id', category_id);

  const { data, error, count } = await query;
  if (error) throw error;

  const songs = (data ?? []).map((s: any) => ({
    ...s,
    categories: s.categories?.map((sc: any) => sc.category) ?? [],
  }));

  return {
    data: songs,
    count: count ?? 0,
    page,
    per_page,
    total_pages: Math.ceil((count ?? 0) / per_page),
  };
}

export async function getSongById(client: SupabaseClient, id: string): Promise<Song> {
  const { data, error } = await client
    .from('songs')
    .select(`
      *,
      creator:users!created_by(id, full_name, avatar_url),
      categories:song_categories(
        category:liturgical_categories(*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return {
    ...data,
    categories: data.categories?.map((sc: any) => sc.category) ?? [],
  };
}

export async function createSong(
  client: SupabaseClient,
  payload: CreateSongPayload,
  userId: string
): Promise<Song> {
  const { category_ids, ...songData } = payload;

  const { data: song, error } = await client
    .from('songs')
    .insert({ ...songData, created_by: userId, status: 'draft' })
    .select()
    .single();

  if (error) throw error;

  if (category_ids?.length) {
    const { error: catError } = await client.from('song_categories').insert(
      category_ids.map(cat_id => ({ song_id: song.id, category_id: cat_id }))
    );
    if (catError) throw catError;
  }

  // Create initial revision
  await client.from('song_revisions').insert({
    song_id: song.id,
    version: 1,
    title: song.title,
    lyrics: song.lyrics,
    chords: song.chords,
    changed_by: userId,
    change_note: 'Versão inicial',
  });

  return song;
}

export async function updateSong(
  client: SupabaseClient,
  id: string,
  payload: UpdateSongPayload,
  userId: string
): Promise<Song> {
  const { category_ids, ...songData } = payload as any;

  const { data: song, error } = await client
    .from('songs')
    .update({ ...songData, updated_by: userId })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  if (category_ids !== undefined) {
    await client.from('song_categories').delete().eq('song_id', id);
    if (category_ids.length) {
      await client.from('song_categories').insert(
        category_ids.map((cat_id: number) => ({ song_id: id, category_id: cat_id }))
      );
    }
  }

  // Create revision
  const { data: lastRev } = await client
    .from('song_revisions')
    .select('version')
    .eq('song_id', id)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  await client.from('song_revisions').insert({
    song_id: id,
    version: (lastRev?.version ?? 0) + 1,
    title: song.title,
    lyrics: song.lyrics,
    chords: song.chords,
    changed_by: userId,
    change_note: 'Atualização',
  });

  return song;
}

export async function submitSongForReview(
  client: SupabaseClient,
  id: string,
  userId: string
): Promise<void> {
  const { error } = await client
    .from('songs')
    .update({ status: 'pending', updated_by: userId })
    .eq('id', id)
    .eq('created_by', userId); // only owner can submit

  if (error) throw error;

  await client.from('song_approvals').insert({
    song_id: id,
    submitted_by: userId,
    status: 'pending',
  });
}

export async function deleteSong(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('songs').delete().eq('id', id);
  if (error) throw error;
}

export async function getSongRevisions(
  client: SupabaseClient,
  songId: string
): Promise<SongRevision[]> {
  const { data, error } = await client
    .from('song_revisions')
    .select(`*, author:users!changed_by(id, full_name, avatar_url)`)
    .eq('song_id', songId)
    .order('version', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
