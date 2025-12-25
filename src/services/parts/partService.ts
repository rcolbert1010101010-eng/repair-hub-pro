import type { Part } from '@/types';

export const validatePartSave = (
  parts: Part[],
  params: { currentId?: string | null; partNumber: string; vendorId: string; categoryId: string }
): { ok: true } | { ok: false; error: string } => {
  const partNumber = params.partNumber.trim();

  if (!partNumber) {
    return { ok: false, error: 'Part number is required' };
  }

  if (!params.vendorId) {
    return { ok: false, error: 'Vendor is required' };
  }

  if (!params.categoryId) {
    return { ok: false, error: 'Category is required' };
  }

  const exists = parts.some(
    (p) => p.id !== params.currentId && p.part_number.toLowerCase() === partNumber.toLowerCase()
  );

  if (exists) {
    return { ok: false, error: 'A part with this number already exists' };
  }

  return { ok: true };
};
