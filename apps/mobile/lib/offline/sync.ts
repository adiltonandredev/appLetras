import { supabase } from '@/lib/supabase';
import {
  saveRepertoryOffline, getLastSync, setLastSync, getAllOfflineRepertories,
} from './db';
import type { Repertory } from '@rl/types';

export async function downloadRepertoryForOffline(repertoryId: string): Promise<void> {
  const { data, error } = await supabase
    .from('repertories')
    .select(`
      *,
      items:repertory_items(
        *,
        song:songs(
          *,
          categories:song_categories(category:liturgical_categories(*))
        )
      )
    `)
    .eq('id', repertoryId)
    .single();

  if (error) throw error;

  // Normalize categories
  const normalized = {
    ...data,
    items: (data.items ?? [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((item: any) => ({
        ...item,
        song: item.song
          ? {
              ...item.song,
              categories: (item.song.categories ?? []).map((sc: any) => sc.category),
            }
          : null,
      })),
    downloaded_at: new Date().toISOString(),
  };

  saveRepertoryOffline(repertoryId, normalized);
}

export async function syncDelta(): Promise<void> {
  const since = getLastSync();
  if (!since) return;

  try {
    const { data: updated, error } = await supabase
      .from('repertories')
      .select('id')
      .gt('updated_at', since);

    if (error) throw error;

    if (updated && updated.length > 0) {
      await Promise.all(
        updated.map((r: { id: string }) => downloadRepertoryForOffline(r.id).catch(() => {}))
      );
    }

    setLastSync(new Date().toISOString());
  } catch {
    // Silently fail — sync on next opportunity
  }
}

export function getOfflineRepertoriesList(): Repertory[] {
  return getAllOfflineRepertories() as Repertory[];
}
