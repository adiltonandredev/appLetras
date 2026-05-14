'use client';

import { createClient } from '@/lib/supabase/client';

interface AuditParams {
  action: string;
  entity_type?: string;
  entity_id?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
}

/**
 * Registra uma ação de auditoria diretamente na tabela audit_logs.
 * Fire-and-forget — não bloqueia a UI em caso de falha.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('audit_logs').insert({
      user_id:     user.id,
      action:      params.action,
      entity_type: params.entity_type ?? null,
      entity_id:   params.entity_id   ? String(params.entity_id) : null,
      old_value:   params.old_value   ?? null,
      new_value:   params.new_value   ?? null,
    });
  } catch {
    // Silencioso — log não deve quebrar a UX
  }
}
