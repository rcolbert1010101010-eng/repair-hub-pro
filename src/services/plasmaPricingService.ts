import type { PlasmaJob, PlasmaJobLine } from '@/types';

export interface PlasmaPricingSettings {
  materialCostPerInch: number;
  consumableCostPerPierce: number;
  setupRatePerMinute: number;
  machineRatePerMinute: number;
  overheadPercent: number;
  markupPercent: number;
  calcVersion: number;
  cutSpeeds: Record<string, Record<number, number>>; // inches per minute
  pierceSeconds: Record<string, Record<number, number>>; // seconds per pierce
  consumablesCostPerMinute: number;
  defaultSetupMinutes: number;
}

const DEFAULT_PLASMA_PRICING_SETTINGS: PlasmaPricingSettings = {
  materialCostPerInch: 0.9,
  consumableCostPerPierce: 0.3,
  setupRatePerMinute: 1.75,
  machineRatePerMinute: 2.25,
  overheadPercent: 12,
  markupPercent: 25,
  calcVersion: 1,
  // Hardcoded defaults until system settings wiring exists
  cutSpeeds: {
    STEEL: { 0.25: 140, 0.5: 90, 0.75: 60 },
    ALUMINUM: { 0.25: 200, 0.5: 140, 0.75: 100 },
    STAINLESS: { 0.25: 120, 0.5: 80, 0.75: 55 },
  },
  pierceSeconds: {
    STEEL: { 0.25: 2.5, 0.5: 3.5, 0.75: 4.5 },
    ALUMINUM: { 0.25: 2, 0.5: 3, 0.75: 4 },
    STAINLESS: { 0.25: 3, 0.5: 4, 0.75: 5 },
  },
  consumablesCostPerMinute: 1.2,
  defaultSetupMinutes: 5,
};

export interface PlasmaJobTotals {
  material_cost: number;
  consumables_cost: number;
  labor_cost: number;
  overhead_cost: number;
  sell_price_total: number;
}

export interface PlasmaPricingWarning {
  code: 'MISSING_MATERIAL' | 'MISSING_THICKNESS' | 'SPEED_LOOKUP_MISSING';
  message: string;
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export function calculatePlasmaJob(
  _job: PlasmaJob,
  lines: PlasmaJobLine[],
  settings?: Partial<PlasmaPricingSettings>
): { lines: PlasmaJobLine[]; totals: PlasmaJobTotals; warnings: PlasmaPricingWarning[] } {
  const config: PlasmaPricingSettings = { ...DEFAULT_PLASMA_PRICING_SETTINGS, ...settings };
  const warnings: PlasmaPricingWarning[] = [];

  const updatedLines = lines.map((line) => {
    const qty = Number.isFinite(line.qty) ? line.qty : 0;
    const cutLength = line.cut_length ?? 0;
    const pierces = line.pierce_count ?? 0;
    const setupMinutes = line.setup_minutes ?? config.defaultSetupMinutes;

    const materialKey = line.material_type?.toUpperCase();
    const thicknessKey = line.thickness ?? undefined;
    if (!materialKey) {
      warnings.push({ code: 'MISSING_MATERIAL', message: `Line ${line.id}: material type missing` });
    }
    if (thicknessKey == null) {
      warnings.push({ code: 'MISSING_THICKNESS', message: `Line ${line.id}: thickness missing` });
    }

    let derivedMachineMinutes: number | null = null;
    const speedTable = materialKey && thicknessKey != null ? config.cutSpeeds[materialKey] : undefined;
    const ipm = speedTable?.[thicknessKey ?? 0];
    if (!line.override_machine_minutes && materialKey && thicknessKey != null && ipm && ipm > 0) {
      derivedMachineMinutes = cutLength > 0 ? cutLength / ipm : 0;
    } else if (!line.override_machine_minutes && materialKey && thicknessKey != null) {
      warnings.push({
        code: 'SPEED_LOOKUP_MISSING',
        message: `Line ${line.id}: no cut speed for ${materialKey} @ ${thicknessKey}`,
      });
    }

    const pierceSeconds = materialKey && thicknessKey != null ? config.pierceSeconds[materialKey]?.[thicknessKey ?? 0] ?? 0 : 0;
    const pierceMinutes = pierces > 0 ? (pierceSeconds * pierces) / 60 : 0;

    const machine_minutes = line.override_machine_minutes ? line.machine_minutes ?? 0 : (derivedMachineMinutes ?? 0) + pierceMinutes;

    const material_cost = roundCurrency(cutLength * config.materialCostPerInch * qty);
    const consumables_cost = roundCurrency(pierces * config.consumableCostPerPierce * qty);
    const runtimeConsumable = line.override_consumables_cost
      ? line.consumables_cost ?? 0
      : machine_minutes * config.consumablesCostPerMinute;
    const totalConsumables = consumables_cost + runtimeConsumable;

    const labor_setup = setupMinutes * config.setupRatePerMinute;
    const labor_machine = machine_minutes * config.machineRatePerMinute;
    const labor_cost = roundCurrency(labor_setup + labor_machine);
    const overhead_cost = roundCurrency((material_cost + totalConsumables + labor_cost) * (config.overheadPercent / 100));
    const rawEach = material_cost + totalConsumables + labor_cost + overhead_cost;

    const sell_price_each =
      line.overrides?.sell_price_each != null ? line.overrides.sell_price_each : roundCurrency(rawEach * (1 + config.markupPercent / 100));
    const sell_price_total =
      line.overrides?.sell_price_total != null ? line.overrides.sell_price_total : roundCurrency(sell_price_each * qty);

    return {
      ...line,
      material_cost,
      consumables_cost: totalConsumables,
      derived_consumables_cost: runtimeConsumable,
      labor_cost,
      overhead_cost,
      derived_machine_minutes: derivedMachineMinutes,
      sell_price_each,
      sell_price_total,
      calc_version: config.calcVersion,
    };
  });

  const totals = updatedLines.reduce<PlasmaJobTotals>(
    (acc, line) => {
      acc.material_cost += line.material_cost;
      acc.consumables_cost += line.consumables_cost;
      acc.labor_cost += line.labor_cost;
      acc.overhead_cost += line.overhead_cost;
      acc.sell_price_total += line.sell_price_total;
      return acc;
    },
    { material_cost: 0, consumables_cost: 0, labor_cost: 0, overhead_cost: 0, sell_price_total: 0 }
  );

  return {
    lines: updatedLines,
    totals: {
      material_cost: roundCurrency(totals.material_cost),
      consumables_cost: roundCurrency(totals.consumables_cost),
      labor_cost: roundCurrency(totals.labor_cost),
      overhead_cost: roundCurrency(totals.overhead_cost),
      sell_price_total: roundCurrency(totals.sell_price_total),
    },
    warnings,
  };
}

export const plasmaPricingDefaults = DEFAULT_PLASMA_PRICING_SETTINGS;
