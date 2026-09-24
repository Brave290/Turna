'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/dashboard-data';

export type SoloActionState = {
  error?: { form?: string[] };
  success?: string;
} | null;

export async function createSoloLedger(
  _prev: SoloActionState,
  formData: FormData
): Promise<SoloActionState> {
  const { supabase, user } = await requireUser();
  const name = String(formData.get('name') ?? '').trim();
  const currency = String(formData.get('currency') ?? 'NGN').slice(0, 3).toUpperCase();
  const defaultAmountKobo = Math.max(
    0,
    Math.round(Number(String(formData.get('default_amount') ?? '0').replace(/[^\d.]/g, '')) * 100)
  );
  const description = String(formData.get('description') ?? '').trim().slice(0, 280);

  if (!name) return { error: { form: ['Give your ledger a name'] } };

  const { data, error } = await supabase
    .from('solo_ledgers')
    .insert({
      user_id: user.id,
      name,
      currency: currency || 'NGN',
      default_amount: defaultAmountKobo,
      description: description || null,
      local_updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) return { error: { form: [error.message] } };
  revalidatePath('/dashboard/solo-ledger');
  redirect(`/dashboard/solo-ledger/${data.id}`);
}

export async function renameSoloLedger(
  _prev: SoloActionState,
  formData: FormData
): Promise<SoloActionState> {
  const { supabase } = await requireUser();
  const id = String(formData.get('id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  if (!id || !name) return { error: { form: ['Name required'] } };
  const { error } = await supabase
    .from('solo_ledgers')
    .update({ name, local_updated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: { form: [error.message] } };
  revalidatePath(`/dashboard/solo-ledger/${id}`);
  return { success: 'Ledger renamed' };
}

export async function deleteSoloLedger(
  _prev: SoloActionState,
  formData: FormData
): Promise<SoloActionState> {
  const { supabase } = await requireUser();
  const id = String(formData.get('id') ?? '');
  if (!id) return { error: { form: ['Missing ledger'] } };
  const { error } = await supabase.from('solo_ledgers').delete().eq('id', id);
  if (error) return { error: { form: [error.message] } };
  revalidatePath('/dashboard/solo-ledger');
  return { success: 'Ledger deleted' };
}

export async function addSoloContributor(
  _prev: SoloActionState,
  formData: FormData
): Promise<SoloActionState> {
  const { supabase, user } = await requireUser();
  const ledgerId = String(formData.get('ledger_id') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim() || null;
  const note = String(formData.get('note') ?? '').trim() || null;
  const expected = Math.max(
    0,
    Math.round(Number(String(formData.get('expected_amount') ?? '0').replace(/[^\d.]/g, '')) * 100)
  );
  if (!ledgerId || !name) return { error: { form: ['Name required'] } };

  const { data: maxRow } = await supabase
    .from('solo_contributors')
    .select('sort_order')
    .eq('ledger_id', ledgerId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from('solo_contributors').insert({
    ledger_id: ledgerId,
    user_id: user.id,
    name,
    phone,
    note,
    expected_amount: expected,
    sort_order: (maxRow?.sort_order ?? 0) + 1,
    local_updated_at: new Date().toISOString(),
  });
  if (error) return { error: { form: [error.message] } };
  revalidatePath(`/dashboard/solo-ledger/${ledgerId}`);
  return { success: `${name} added` };
}

export async function updateSoloEntry(
  _prev: SoloActionState,
  formData: FormData
): Promise<SoloActionState> {
  const { supabase, user } = await requireUser();
  const ledgerId = String(formData.get('ledger_id') ?? '');
  const contributorId = String(formData.get('contributor_id') ?? '');
  const period = String(formData.get('period') ?? '');
  const status = String(formData.get('status') ?? 'unpaid');
  const amountRaw = String(formData.get('amount_paid') ?? '0');
  const paidOn = String(formData.get('paid_on') ?? '') || null;
  const note = String(formData.get('note') ?? '').trim() || null;
  const localUpdatedAt = String(formData.get('local_updated_at') ?? new Date().toISOString());

  if (!ledgerId || !contributorId || !/^\d{4}-\d{2}$/.test(period)) {
    return { error: { form: ['Invalid entry'] } };
  }
  if (!['unpaid', 'partial', 'paid'].includes(status)) {
    return { error: { form: ['Invalid status'] } };
  }

  const amountPaid = Math.max(
    0,
    Math.round(Number(amountRaw.replace(/[^\d.]/g, '')) * 100)
  );

  const payload = {
    ledger_id: ledgerId,
    contributor_id: contributorId,
    user_id: user.id,
    period,
    status,
    amount_paid: amountPaid,
    paid_on: paidOn,
    note,
    local_updated_at: localUpdatedAt,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('solo_entries').upsert(payload, {
    onConflict: 'contributor_id,period',
  });
  if (error) return { error: { form: [error.message] } };
  revalidatePath(`/dashboard/solo-ledger/${ledgerId}`);
  return { success: status === 'paid' ? 'Marked paid' : status === 'unpaid' ? 'Marked unpaid' : 'Partial saved' };
}

export async function bulkSyncSoloEntries(
  entries: {
    ledger_id: string;
    contributor_id: string;
    period: string;
    status: string;
    amount_paid: number;
    paid_on: string | null;
    note: string | null;
    local_updated_at: string;
  }[]
): Promise<{ ok: boolean; error?: string; synced: number }> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: 'Auth required', synced: 0 };
  if (!Array.isArray(entries) || entries.length === 0) {
    return { ok: true, synced: 0 };
  }
  const rows = entries.slice(0, 200).map((e) => ({
    ledger_id: e.ledger_id,
    contributor_id: e.contributor_id,
    user_id: user.id,
    period: e.period,
    status: e.status,
    amount_paid: Number(e.amount_paid) || 0,
    paid_on: e.paid_on,
    note: e.note,
    local_updated_at: e.local_updated_at,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('solo_entries').upsert(rows, {
    onConflict: 'contributor_id,period',
  });
  if (error) return { ok: false, error: error.message, synced: 0 };
  return { ok: true, synced: rows.length };
}

export async function bulkSyncSoloContributors(
  ledgerId: string,
  contributors: {
    id?: string;
    name: string;
    phone?: string | null;
    note?: string | null;
    expected_amount: number;
    sort_order: number;
    local_updated_at: string;
  }[]
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  if (!ledgerId || !user) return { ok: false, error: 'Auth required' };
  for (const c of contributors.slice(0, 200)) {
    const row = {
      ledger_id: ledgerId,
      user_id: user.id,
      name: c.name,
      phone: c.phone ?? null,
      note: c.note ?? null,
      expected_amount: Number(c.expected_amount) || 0,
      sort_order: Number(c.sort_order) || 0,
      local_updated_at: c.local_updated_at,
      updated_at: new Date().toISOString(),
    };
    if (c.id) {
      const { error } = await supabase
        .from('solo_contributors')
        .upsert({ ...row, id: c.id }, { onConflict: 'id' });
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabase.from('solo_contributors').insert(row);
      if (error) return { ok: false, error: error.message };
    }
  }
  return { ok: true };
}

export async function archiveSoloContributor(
  _prev: SoloActionState,
  formData: FormData
): Promise<SoloActionState> {
  const { supabase } = await requireUser();
  const id = String(formData.get('id') ?? '');
  const ledgerId = String(formData.get('ledger_id') ?? '');
  const archived = String(formData.get('archived') ?? 'true') === 'true';
  if (!id) return { error: { form: ['Missing contributor'] } };
  const { error } = await supabase
    .from('solo_contributors')
    .update({ archived, local_updated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: { form: [error.message] } };
  revalidatePath(`/dashboard/solo-ledger/${ledgerId}`);
  return { success: archived ? 'Archived' : 'Restored' };
}
