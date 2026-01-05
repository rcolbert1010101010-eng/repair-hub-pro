import type { PlasmaJobLine } from '@/types';

export interface PlasmaJobMetrics {
  total_qty: number;
  total_cut_length: number;
  total_pierces: number;
  total_machine_minutes: number;
}

export function computePlasmaJobMetrics(lines: PlasmaJobLine[]): PlasmaJobMetrics {
  return lines.reduce<PlasmaJobMetrics>(
    (acc, line) => {
      const qty = line.qty ?? 0;
      acc.total_qty += qty;
      acc.total_cut_length += (line.cut_length ?? 0) * qty;
      acc.total_pierces += (line.pierce_count ?? 0) * qty;
      acc.total_machine_minutes += (line.machine_minutes ?? 0) * qty;
      return acc;
    },
    { total_qty: 0, total_cut_length: 0, total_pierces: 0, total_machine_minutes: 0 }
  );
}
