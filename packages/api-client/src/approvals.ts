import type { SupabaseClient } from '@supabase/supabase-js';
import type { SongApproval, ApproveRejectPayload } from '@rl/types';

export async function getPendingApprovals(client: SupabaseClient): Promise<SongApproval[]> {
  const { data, error } = await client
    .from('song_approvals')
    .select(`
      *,
      submitter:users!submitted_by(id, full_name, avatar_url),
      song:songs(id, title, status, lyrics, key_note)
    `)
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getAllApprovals(client: SupabaseClient, songId?: string): Promise<SongApproval[]> {
  let query = client
    .from('song_approvals')
    .select(`
      *,
      submitter:users!submitted_by(id, full_name, avatar_url),
      reviewer:users!reviewed_by(id, full_name, avatar_url),
      song:songs(id, title, status)
    `)
    .order('submitted_at', { ascending: false });

  if (songId) query = query.eq('song_id', songId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function approveSong(
  client: SupabaseClient,
  approvalId: string,
  reviewerId: string,
  payload: ApproveRejectPayload = {}
): Promise<void> {
  const { data: approval, error: fetchError } = await client
    .from('song_approvals')
    .select('song_id')
    .eq('id', approvalId)
    .single();

  if (fetchError) throw fetchError;

  const { error: approvalError } = await client
    .from('song_approvals')
    .update({
      status: 'approved',
      reviewed_by: reviewerId,
      comment: payload.comment,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', approvalId);

  if (approvalError) throw approvalError;

  const { error: songError } = await client
    .from('songs')
    .update({ status: 'approved', updated_by: reviewerId })
    .eq('id', approval.song_id);

  if (songError) throw songError;
}

export async function rejectSong(
  client: SupabaseClient,
  approvalId: string,
  reviewerId: string,
  payload: ApproveRejectPayload
): Promise<void> {
  const { data: approval, error: fetchError } = await client
    .from('song_approvals')
    .select('song_id')
    .eq('id', approvalId)
    .single();

  if (fetchError) throw fetchError;

  const { error: approvalError } = await client
    .from('song_approvals')
    .update({
      status: 'rejected',
      reviewed_by: reviewerId,
      comment: payload.comment,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', approvalId);

  if (approvalError) throw approvalError;

  const { error: songError } = await client
    .from('songs')
    .update({ status: 'rejected', updated_by: reviewerId })
    .eq('id', approval.song_id);

  if (songError) throw songError;
}

export async function requestRevision(
  client: SupabaseClient,
  approvalId: string,
  reviewerId: string,
  payload: ApproveRejectPayload
): Promise<void> {
  const { data: approval, error: fetchError } = await client
    .from('song_approvals')
    .select('song_id')
    .eq('id', approvalId)
    .single();

  if (fetchError) throw fetchError;

  const { error: approvalError } = await client
    .from('song_approvals')
    .update({
      status: 'revision_requested',
      reviewed_by: reviewerId,
      comment: payload.comment,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', approvalId);

  if (approvalError) throw approvalError;

  const { error: songError } = await client
    .from('songs')
    .update({ status: 'revision_requested', updated_by: reviewerId })
    .eq('id', approval.song_id);

  if (songError) throw songError;
}
