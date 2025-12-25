import type { Customer } from '@/types';

export const validateNewCustomer = (
  customers: Customer[],
  input: { company_name: string; phone: string | null }
): { ok: true } | { ok: false; error: string } => {
  const companyName = input.company_name.trim();

  if (!companyName) {
    return { ok: false, error: 'Company name is required' };
  }

  const exists = customers.some((c) => c.company_name.toLowerCase() === companyName.toLowerCase());
  if (exists) {
    return { ok: false, error: 'A customer with this company name already exists' };
  }

  if (input.phone) {
    const phoneExists = customers.some((c) => c.phone === input.phone);
    if (phoneExists) {
      return { ok: false, error: 'A customer with this phone number already exists' };
    }
  }

  return { ok: true };
};
