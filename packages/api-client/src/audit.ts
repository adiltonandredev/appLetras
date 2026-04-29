import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuditLog } from '@rl/types';

export async function getAuditLogs(
  client: SupabaseClient,
  filters: { user_id?: string; entity_type?: string; entity_id?: string; limit?: number } = {}
): Promise<AuditLog[]> {
  let query = client
    .from('audit_logs')
    .select(`*, user:users(id, full_name, avatar_url)`)
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 100);

  if (filters.user_id) query = query.eq('user_id', filters.user_id);
  if (filters.entity_type) query = query.eq('entity_type', filters.entity_type);
  if (filters.entity_id) query = query.eq('entity_id', filters.entity_id);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function insertAuditLog(
  client: SupabaseClient,
  log: Pick<AuditLog, 'user_id' | 'action' | 'entity_type' | 'entity_id' | 'old_value' | 'new_value'>
): Promise<void> {
  await client.from('audit_logs').insert(log);
}
