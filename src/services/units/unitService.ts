import type { Unit } from '@/types';

export const validateUnitSave = (
  units: Unit[],
  params: { currentId?: string | null; customerId: string; unitName: string; vin: string | null }
): { ok: true } | { ok: false; error: string } => {
  const { currentId, customerId, unitName, vin } = params;
  const trimmedName = unitName.trim();
  const trimmedVin = vin ? vin.trim() : null;

  if (!customerId) {
    return { ok: false, error: 'Customer is required' };
  }

  if (!trimmedName) {
    return { ok: false, error: 'Unit name is required' };
  }

  if (trimmedVin) {
    const vinExists = units.some(
      (u) => u.id !== currentId && u.vin?.toLowerCase() === trimmedVin.toLowerCase()
    );
    if (vinExists) {
      return { ok: false, error: 'A unit with this VIN already exists' };
    }
  }

  const nameExists = units.some(
    (u) =>
      u.id !== currentId &&
      u.customer_id === customerId &&
      u.unit_name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (nameExists) {
    return { ok: false, error: 'This customer already has a unit with this name' };
  }

  return { ok: true };
};
