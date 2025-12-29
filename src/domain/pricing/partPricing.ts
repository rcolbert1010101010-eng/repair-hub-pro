import type { Part, SystemSettings, PriceLevel } from '@/types';

export function getPartCostBasis(
  part: Part
): { basis: number | null; source: 'AVG_COST' | 'LAST_COST' | 'COST' | 'NONE' } {
  if (part.avg_cost != null && part.avg_cost > 0) return { basis: part.avg_cost, source: 'AVG_COST' };
  if (part.last_cost != null && part.last_cost > 0) return { basis: part.last_cost, source: 'LAST_COST' };
  if (part.cost != null && part.cost > 0) return { basis: part.cost, source: 'COST' };
  return { basis: null, source: 'NONE' };
}

export function calcPartPriceForLevel(
  part: Part,
  settings: SystemSettings,
  level: PriceLevel
): number | null {
  const { basis } = getPartCostBasis(part);
  if (basis == null) return null;

  const markupMap: Record<PriceLevel, number> = {
    RETAIL: settings.markup_retail_percent,
    FLEET: settings.markup_fleet_percent,
    WHOLESALE: settings.markup_wholesale_percent,
  };

  const pct = markupMap[level] ?? 0;
  const price = basis * (1 + pct / 100);
  return Math.round(price * 100) / 100;
}
