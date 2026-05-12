import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRepertoryById } from '@rl/api-client';
import { CELEBRATION_LABELS, CELEBRATION_ICONS } from '@rl/utils';
import { ApresentacaoClient } from '@/components/repertories/ApresentacaoClient';

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: 'Modo Apresentação' };
}

export default async function ApresentacaoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) notFound();

  try {
    const repertory = await getRepertoryById(supabase, params.id);
    if (!repertory) notFound();

    const items = (repertory.items ?? []).filter((item: any) => item.song);

    return (
      <ApresentacaoClient
        repertoryTitle={repertory.title}
        celebration={(repertory as any).celebration}
        items={items}
      />
    );
  } catch {
    notFound();
  }
}
