import type {
  Return,
  ReturnLine,
  WarrantyClaim,
  WarrantyClaimLine,
  Vendor,
  Part,
} from '@/types';

type DateRange = '30' | '90' | '365' | 'all';

const getStartDate = (range: DateRange): number | null => {
  const days = range === 'all' ? null : Number(range);
  if (!days) return null;
  return Date.now() - days * 24 * 60 * 60 * 1000;
};

const inRange = (ts: string, start: number | null) => {
  if (!start) return true;
  return new Date(ts).getTime() >= start;
};

const agingBucket = (created: string) => {
  const days = Math.floor((Date.now() - new Date(created).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 7) return '0-7';
  if (days <= 14) return '8-14';
  if (days <= 30) return '15-30';
  if (days <= 60) return '31-60';
  return '60+';
};

export interface ReportInput {
  returns: Return[];
  returnLines: ReturnLine[];
  claims: WarrantyClaim[];
  claimLines: WarrantyClaimLine[];
  vendors: Vendor[];
  parts: Part[];
  range: DateRange;
  vendorId?: string;
}

export interface ReportResult {
  totals: {
    returns: { total: number; open: number; closed: number };
    claims: { total: number; open: number; approved: number; denied: number; closed: number };
  };
  aging: {
    returns: Record<string, number>;
    claims: Record<string, number>;
  };
  financial: {
    requested: number;
    approved: number;
    credit: number;
    reimbursed: number;
  };
  topVendors: Array<{ vendor_id: string; name: string; count: number; amount: number }>;
  topParts: Array<{ part_id: string; part_number: string; count: number; amount: number }>;
}

export function computeReturnsWarrantyReport(input: ReportInput): ReportResult {
  const start = getStartDate(input.range);
  const filterVendor = (id?: string | null) => (!input.vendorId ? true : id === input.vendorId);

  const filteredReturns = input.returns.filter(
    (r) => r.is_active && filterVendor(r.vendor_id) && inRange(r.created_at, start)
  );
  const filteredClaims = input.claims.filter(
    (c) => c.is_active && filterVendor(c.vendor_id) && inRange(c.created_at, start)
  );

  const totals = {
    returns: {
      total: filteredReturns.length,
      open: filteredReturns.filter((r) => !['CLOSED', 'CANCELLED'].includes(r.status)).length,
      closed: filteredReturns.filter((r) => ['CLOSED', 'CANCELLED'].includes(r.status)).length,
    },
    claims: {
      total: filteredClaims.length,
      open: filteredClaims.filter((c) => !['CLOSED', 'CANCELLED', 'DENIED', 'PAID'].includes(c.status)).length,
      approved: filteredClaims.filter((c) => c.status === 'APPROVED').length,
      denied: filteredClaims.filter((c) => c.status === 'DENIED').length,
      closed: filteredClaims.filter((c) => ['CLOSED', 'PAID'].includes(c.status)).length,
    },
  };

  const aging = {
    returns: {} as Record<string, number>,
    claims: {} as Record<string, number>,
  };
  ['0-7', '8-14', '15-30', '31-60', '60+'].forEach((bucket) => {
    aging.returns[bucket] = 0;
    aging.claims[bucket] = 0;
  });
  filteredReturns.forEach((r) => {
    aging.returns[agingBucket(r.created_at)] += 1;
  });
  filteredClaims.forEach((c) => {
    aging.claims[agingBucket(c.created_at)] += 1;
  });

  const financial = {
    requested: 0,
    approved: 0,
    credit: 0,
    reimbursed: 0,
  };

  filteredReturns.forEach((r) => {
    financial.approved += r.approved_amount ?? 0;
    financial.credit += (r.credit_amount ?? 0) + (r.credit_memo_amount ?? 0);
    financial.reimbursed += r.reimbursed_amount ?? 0;
  });
  filteredClaims.forEach((c) => {
    financial.requested += c.amount_requested ?? 0;
    financial.approved += c.approved_amount ?? 0;
    financial.credit += (c.credit_memo_amount ?? 0);
    financial.reimbursed += c.reimbursed_amount ?? 0;
  });

  const vendorMap: Record<string, { count: number; amount: number }> = {};
  filteredReturns.forEach((r) => {
    if (!vendorMap[r.vendor_id]) vendorMap[r.vendor_id] = { count: 0, amount: 0 };
    vendorMap[r.vendor_id].count += 1;
    vendorMap[r.vendor_id].amount += (r.approved_amount ?? 0) + (r.credit_amount ?? 0) + (r.credit_memo_amount ?? 0);
  });
  filteredClaims.forEach((c) => {
    if (!vendorMap[c.vendor_id]) vendorMap[c.vendor_id] = { count: 0, amount: 0 };
    vendorMap[c.vendor_id].count += 1;
    vendorMap[c.vendor_id].amount += (c.approved_amount ?? 0) + (c.credit_memo_amount ?? 0) + (c.reimbursed_amount ?? 0);
  });
  const topVendors = Object.entries(vendorMap)
    .map(([vendor_id, data]) => ({
      vendor_id,
      name: input.vendors.find((v) => v.id === vendor_id)?.vendor_name || vendor_id,
      count: data.count,
      amount: data.amount,
    }))
    .sort((a, b) => b.amount - a.amount || b.count - a.count)
    .slice(0, 5);

  const partMap: Record<string, { count: number; amount: number }> = {};
  input.returnLines
    .filter((l) => l.is_active && filteredReturns.some((r) => r.id === l.return_id))
    .forEach((l) => {
      if (!l.part_id) return;
      if (!partMap[l.part_id]) partMap[l.part_id] = { count: 0, amount: 0 };
      partMap[l.part_id].count += l.quantity;
      partMap[l.part_id].amount += (l.unit_cost ?? 0) * l.quantity;
    });
  input.claimLines
    .filter((l) => l.is_active && filteredClaims.some((c) => c.id === l.claim_id))
    .forEach((l) => {
      if (!l.part_id) return;
      if (!partMap[l.part_id]) partMap[l.part_id] = { count: 0, amount: 0 };
      partMap[l.part_id].count += l.quantity ?? 0;
      partMap[l.part_id].amount += l.amount ?? 0;
    });

  const topParts = Object.entries(partMap)
    .map(([part_id, data]) => ({
      part_id,
      part_number: input.parts.find((p) => p.id === part_id)?.part_number || part_id,
      count: data.count,
      amount: data.amount,
    }))
    .sort((a, b) => b.amount - a.amount || b.count - a.count)
    .slice(0, 5);

  return { totals, aging, financial, topVendors, topParts };
}
