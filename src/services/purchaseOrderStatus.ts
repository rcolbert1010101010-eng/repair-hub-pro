import type { PurchaseOrder, PurchaseOrderLine } from '@/types';

export type DerivedPurchaseOrderStatus = 'OPEN' | 'PARTIALLY_RECEIVED' | 'RECEIVED';

export function getPurchaseOrderDerivedStatus(
  order: PurchaseOrder,
  lines: PurchaseOrderLine[] = []
): DerivedPurchaseOrderStatus {
  if (order.status === 'CLOSED') return 'RECEIVED';

  if (!lines.length) return 'OPEN';

  const totals = lines.reduce(
    (acc, line) => {
      acc.ordered += line.ordered_quantity;
      acc.received += line.received_quantity;
      return acc;
    },
    { ordered: 0, received: 0 }
  );

  if (totals.ordered === 0) return 'OPEN';
  if (totals.received === 0) return 'OPEN';
  if (totals.received < totals.ordered) return 'PARTIALLY_RECEIVED';

  return 'RECEIVED';
}
