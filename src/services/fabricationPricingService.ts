import type { FabJob, FabJobLine } from '@/types';

export interface FabricationPricingSettings {
  calcVersion: number;
  pressBrake: {
    secondsPerBend: number;
    inchesPerMinute: number;
    setupMinutes: number;
    laborRatePerHour: number;
    overheadRatePerHour: number;
    consumablesPerBend: number;
    tonnageCostPerJob: number;
    toolingCostPerJob: number;
    markupPercent: number;
  };
  welding: {
    setupMinutes: number;
    processRates: Record<'MIG' | 'TIG' | 'STICK' | 'FLUX', { inchesPerMinute: number }>;
    consumablesPerInch: Record<'MIG' | 'TIG' | 'STICK' | 'FLUX', number>;
    laborRatePerHour: number;
    overheadRatePerHour: number;
    markupPercent: number;
  };
}

const DEFAULT_FABRICATION_PRICING_SETTINGS: FabricationPricingSettings = {
  calcVersion: 1,
  pressBrake: {
    secondsPerBend: 8,
    inchesPerMinute: 240,
    setupMinutes: 10,
    laborRatePerHour: 95,
    overheadRatePerHour: 45,
    consumablesPerBend: 0.45,
    tonnageCostPerJob: 6,
    toolingCostPerJob: 12,
    markupPercent: 22,
  },
  welding: {
    setupMinutes: 8,
    processRates: {
      MIG: { inchesPerMinute: 14 },
      TIG: { inchesPerMinute: 8 },
      STICK: { inchesPerMinute: 10 },
      FLUX: { inchesPerMinute: 12 },
    },
    consumablesPerInch: {
      MIG: 0.4,
      TIG: 0.55,
      STICK: 0.35,
      FLUX: 0.32,
    },
    laborRatePerHour: 90,
    overheadRatePerHour: 40,
    markupPercent: 25,
  },
};

const mergeSettings = (settings?: Partial<FabricationPricingSettings>): FabricationPricingSettings => ({
  ...DEFAULT_FABRICATION_PRICING_SETTINGS,
  ...settings,
  pressBrake: {
    ...DEFAULT_FABRICATION_PRICING_SETTINGS.pressBrake,
    ...(settings?.pressBrake ?? {}),
  },
  welding: {
    ...DEFAULT_FABRICATION_PRICING_SETTINGS.welding,
    ...(settings?.welding ?? {}),
    processRates: {
      ...DEFAULT_FABRICATION_PRICING_SETTINGS.welding.processRates,
      ...(settings?.welding?.processRates ?? {}),
    },
    consumablesPerInch: {
      ...DEFAULT_FABRICATION_PRICING_SETTINGS.welding.consumablesPerInch,
      ...(settings?.welding?.consumablesPerInch ?? {}),
    },
  },
});

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export function calculateFabJob(
  _job: FabJob,
  lines: FabJobLine[],
  settings?: Partial<FabricationPricingSettings>
): { lines: FabJobLine[]; warnings: string[] } {
  const config = mergeSettings(settings);
  const warnings: string[] = [];

  const updatedLines = lines.map((line, idx) => {
    const qty = Number.isFinite(line.qty) ? line.qty : 0;
    const setupMinutes =
      line.setup_minutes ??
      (line.operation_type === 'PRESS_BRAKE' ? config.pressBrake.setupMinutes : config.welding.setupMinutes);

    let derivedMachineMinutes: number | null = null;
    let machine_minutes = line.machine_minutes ?? 0;
    let consumables_cost = line.consumables_cost ?? 0;
    let labor_cost = line.labor_cost ?? 0;
    let overhead_cost = line.overhead_cost ?? 0;
    let sell_price_each = line.sell_price_each ?? 0;
    let sell_price_total = line.sell_price_total ?? 0;

    if (line.operation_type === 'PRESS_BRAKE') {
      const missingFields: string[] = [];
      if (line.bends_count == null) {
        missingFields.push('bends count');
      }
      if (line.bend_length == null) {
        missingFields.push('bend length (in)');
      }
      if (missingFields.length > 0) {
        const suffix = `needs ${missingFields.join(', ')} to calculate pricing (or override machine minutes).`;
        warnings.push(`PRESS_BRAKE${Number.isFinite(idx) ? ` line ${idx + 1}` : ''}: ${suffix}`);
      }
      const bendsCount = line.bends_count ?? 0;
      const bendLength = line.bend_length ?? 0;
      const bendMinutes = bendsCount * (config.pressBrake.secondsPerBend / 60);
      const travelMinutes =
        config.pressBrake.inchesPerMinute > 0 ? bendLength / config.pressBrake.inchesPerMinute : 0;
      if (!line.override_machine_minutes) {
        derivedMachineMinutes = setupMinutes + (bendMinutes + travelMinutes) * Math.max(qty, 1);
        machine_minutes = derivedMachineMinutes;
      }
      const consumableBase =
        bendsCount * config.pressBrake.consumablesPerBend * Math.max(qty, 1) +
        config.pressBrake.toolingCostPerJob +
        config.pressBrake.tonnageCostPerJob;
      consumables_cost = line.override_consumables_cost ? line.consumables_cost ?? 0 : roundCurrency(consumableBase);
      const laborRatePerMinute = config.pressBrake.laborRatePerHour / 60;
      const overheadRatePerMinute = config.pressBrake.overheadRatePerHour / 60;
      labor_cost = line.override_labor_cost ? line.labor_cost ?? 0 : roundCurrency(machine_minutes * laborRatePerMinute);
      overhead_cost = roundCurrency(machine_minutes * overheadRatePerMinute);
      const rawTotal = consumables_cost + labor_cost + overhead_cost;
      const baseEach = qty > 0 ? rawTotal / qty : rawTotal;
      sell_price_each = roundCurrency(baseEach * (1 + config.pressBrake.markupPercent / 100));
      sell_price_total = roundCurrency(sell_price_each * qty);
    } else {
      const missingFields: string[] = [];
      if (line.weld_length == null) {
        missingFields.push('weld length (in)');
      }
      if (!line.weld_process) {
        missingFields.push('weld process');
      }
      const weldProcess = line.weld_process ?? 'MIG';
      const weldLength = line.weld_length ?? 0;
      const processRate = config.welding.processRates[weldProcess];
      if (!line.override_machine_minutes) {
        const travelMinutes =
          processRate && processRate.inchesPerMinute > 0 ? weldLength / processRate.inchesPerMinute : 0;
        if (!processRate && !missingFields.includes('weld process')) {
          missingFields.push('weld process');
        }
        derivedMachineMinutes = setupMinutes + travelMinutes * Math.max(qty, 1);
        machine_minutes = derivedMachineMinutes;
      }
      const consumableRate = config.welding.consumablesPerInch[weldProcess] ?? 0;
      const consumableBase = weldLength * consumableRate * Math.max(qty, 1);
      consumables_cost = line.override_consumables_cost ? line.consumables_cost ?? 0 : roundCurrency(consumableBase);
      const laborRatePerMinute = config.welding.laborRatePerHour / 60;
      const overheadRatePerMinute = config.welding.overheadRatePerHour / 60;
      labor_cost = line.override_labor_cost ? line.labor_cost ?? 0 : roundCurrency(machine_minutes * laborRatePerMinute);
      overhead_cost = roundCurrency(machine_minutes * overheadRatePerMinute);
      const rawTotal = consumables_cost + labor_cost + overhead_cost;
      const baseEach = qty > 0 ? rawTotal / qty : rawTotal;
      sell_price_each = roundCurrency(baseEach * (1 + config.welding.markupPercent / 100));
      sell_price_total = roundCurrency(sell_price_each * qty);

      if (missingFields.length > 0) {
        const suffix = `needs ${missingFields.join(', ')} to calculate pricing (or override machine minutes).`;
        warnings.push(`WELD${Number.isFinite(idx) ? ` line ${idx + 1}` : ''}: ${suffix}`);
      }
    }

    return {
      ...line,
      setup_minutes: setupMinutes,
      machine_minutes,
      derived_machine_minutes: derivedMachineMinutes,
      consumables_cost,
      labor_cost,
      overhead_cost,
      sell_price_each,
      sell_price_total,
      calc_version: config.calcVersion,
    };
  });

  return { lines: updatedLines, warnings };
}

export const fabricationPricingDefaults = DEFAULT_FABRICATION_PRICING_SETTINGS;
