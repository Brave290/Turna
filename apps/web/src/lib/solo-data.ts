import { requireUser } from '@/lib/dashboard-data';

export type SoloLedger = {
  id: string;
  user_id: string;
  name: string;
  currency: string;
  default_amount: number;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type SoloContributor = {
  id: string;
  ledger_id: string;
  user_id: string;
  name: string;
  phone: string | null;
  note: string | null;
  expected_amount: number;
  sort_order: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type SoloEntry = {
  id: string;
  ledger_id: string;
  contributor_id: string;
  user_id: string;
  period: string;
  status: string;
  amount_paid: number;
  paid_on: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  local_updated_at: string;
};

export async function getSoloLedgers(): Promise<SoloLedger[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from('solo_ledgers')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50);
  return (data ?? []) as SoloLedger[];
}

export async function getSoloLedgerDetail(ledgerId: string): Promise<{
  ledger: SoloLedger;
  contributors: SoloContributor[];
  entries: SoloEntry[];
} | null> {
  const { supabase } = await requireUser();
  const [{ data: ledger }, { data: contributors }, { data: entries }] = await Promise.all([
    supabase.from('solo_ledgers').select('*').eq('id', ledgerId).maybeSingle(),
    supabase
      .from('solo_contributors')
      .select('*')
      .eq('ledger_id', ledgerId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('solo_entries')
      .select('*')
      .eq('ledger_id', ledgerId)
      .order('period', { ascending: true }),
  ]);
  if (!ledger) return null;
  return {
    ledger: ledger as SoloLedger,
    contributors: ((contributors ?? []) as SoloContributor[]).filter((c) => !c.archived),
    entries: (entries ?? []) as SoloEntry[],
  };
}

export function periodKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return periodKey(d);
}

export function formatPeriodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-NG', {
    month: 'long',
    year: 'numeric',
  });
}
