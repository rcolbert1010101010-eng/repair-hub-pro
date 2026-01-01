import type { Return, ReturnLine, WarrantyClaim, WarrantyClaimLine } from '@/types';

type Severity = 'info' | 'warning' | 'danger';

interface InsightResult {
  flags: string[];
  severity: Severity;
  summary: string;
}

const DAYS_90 = 90;

const getAgeDays = (dateStr: string | null | undefined) => {
  if (!dateStr) return 0;
  const created = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
};

const pickSeverity = (flags: string[], ageDays: number): Severity => {
  if (flags.includes('HIGH_RISK_REPEAT') || ageDays >= 60) return 'danger';
  if (ageDays >= 30 || flags.includes('WARRANTY_ELIGIBLE')) return 'warning';
  return 'info';
};

export function getReturnInsights(
  ret: Return,
  context?: { returns?: Return[]; returnLines?: ReturnLine[] }
): InsightResult {
  const flags: string[] = [];
  const ageDays = getAgeDays(ret.created_at);

  if (ret.approved_amount != null || ret.status === 'APPROVED' || ret.status === 'CREDITED') {
    flags.push('WARRANTY_ELIGIBLE');
  }

  if (ageDays >= 60) flags.push('AGING_60');
  else if (ageDays >= 30) flags.push('AGING_30');
  else if (ageDays >= 14) flags.push('AGING_14');
  else if (ageDays >= 7) flags.push('AGING_7');

  const lines = (context?.returnLines || []).filter((l) => l.return_id === ret.id && l.is_active);
  const partIds = new Set(lines.map((l) => l.part_id));
  if (partIds.size > 0 && context?.returns) {
    const cutoff = Date.now() - DAYS_90 * 24 * 60 * 60 * 1000;
    const recent = context.returns.filter(
      (r) =>
        r.vendor_id === ret.vendor_id &&
        r.id !== ret.id &&
        new Date(r.created_at).getTime() >= cutoff &&
        r.is_active
    );
    const linesByReturn = (context.returnLines || []).filter((l) => l.is_active);
    const hasRepeat = recent.some((r) => {
      const otherPartIds = linesByReturn.filter((l) => l.return_id === r.id).map((l) => l.part_id);
      return otherPartIds.some((pid) => partIds.has(pid));
    });
    if (hasRepeat) flags.push('HIGH_RISK_REPEAT');
  }

  const severity = pickSeverity(flags, ageDays);
  const summary = flags.length ? flags.join(', ') : 'Healthy';

  return { flags, severity, summary };
}

export function getWarrantyClaimInsights(
  claim: WarrantyClaim,
  context?: { claims?: WarrantyClaim[]; claimLines?: WarrantyClaimLine[] }
): InsightResult {
  const flags: string[] = [];
  const ageDays = getAgeDays(claim.created_at);

  if (claim.approved_amount != null || claim.status === 'APPROVED' || claim.status === 'PAID') {
    flags.push('WARRANTY_ELIGIBLE');
  }

  if (ageDays >= 60) flags.push('AGING_60');
  else if (ageDays >= 30) flags.push('AGING_30');
  else if (ageDays >= 14) flags.push('AGING_14');
  else if (ageDays >= 7) flags.push('AGING_7');

  const lines = (context?.claimLines || []).filter((l) => l.claim_id === claim.id && l.is_active);
  const partIds = new Set(lines.map((l) => l.part_id).filter(Boolean) as string[]);
  if (partIds.size > 0 && context?.claims) {
    const cutoff = Date.now() - DAYS_90 * 24 * 60 * 60 * 1000;
    const recent = context.claims.filter(
      (c) =>
        c.vendor_id === claim.vendor_id &&
        c.id !== claim.id &&
        new Date(c.created_at).getTime() >= cutoff &&
        c.is_active
    );
    const linesByClaim = (context.claimLines || []).filter((l) => l.is_active);
    const hasRepeat = recent.some((c) => {
      const otherPartIds = linesByClaim.filter((l) => l.claim_id === c.id).map((l) => l.part_id).filter(Boolean);
      return otherPartIds.some((pid) => partIds.has(pid as string));
    });
    if (hasRepeat) flags.push('HIGH_RISK_REPEAT');
  }

  const severity = pickSeverity(flags, ageDays);
  const summary = flags.length ? flags.join(', ') : 'Healthy';

  return { flags, severity, summary };
}
