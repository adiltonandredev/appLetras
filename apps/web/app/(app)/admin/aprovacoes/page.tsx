import type { Metadata } from 'next';
import { requireRole } from '@/lib/auth/permissions';
import { createClient } from '@/lib/supabase/server';
import { ApprovalQueueClient } from '@/components/admin/ApprovalQueueClient';

export const metadata: Metadata = { title: 'Aprovações' };

export default async function ApprovalsPage() {
  const { session } = await requireRole('master');
  const supabase = createClient();

  const { data: pending } = await supabase
    .from('song_approvals')
    .select(`
      *,
      submitter:users!submitted_by(id, full_name, avatar_url),
      song:songs(id, title, status, lyrics, key_note, author)
    `)
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">Aprovações de Letras</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {pending?.length ?? 0} músicas aguardando revisão
          </p>
        </div>
      </div>
      <ApprovalQueueClient
        initialPending={pending ?? []}
        reviewerId={session.user.id}
      />
    </div>
  );
}
