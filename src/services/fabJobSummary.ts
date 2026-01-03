import type { FabJobLine } from '@/types';

export interface FabJobSummaryTotals {
  total_qty: number;
  total_machine_minutes: number;
  total_setup_minutes: number;
  total_sell: number;
  total_cost: number;
}

export function summarizeFabJob(lines: FabJobLine[]): FabJobSummaryTotals {
  return lines.reduce<FabJobSummaryTotals>(
    (acc, line) => {
      const qty = line.qty ?? 0;
      acc.total_qty += qty;
      acc.total_machine_minutes += line.machine_minutes ?? 0;
      acc.total_setup_minutes += line.setup_minutes ?? 0;
      acc.total_sell += line.sell_price_total ?? 0;
      acc.total_cost += (line.consumables_cost ?? 0) + (line.labor_cost ?? 0) + (line.overhead_cost ?? 0);
      return acc;
    },
    { total_qty: 0, total_machine_minutes: 0, total_setup_minutes: 0, total_sell: 0, total_cost: 0 }
  );
}
