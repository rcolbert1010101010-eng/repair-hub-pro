export const generateId = () => crypto.randomUUID();

export const generateOrderNumber = (prefix: string, count: number) =>
  `${prefix}-${String(count + 1).padStart(6, '0')}`;

export const now = () => new Date().toISOString();

export const staticDate = '2024-01-01T00:00:00.000Z';
