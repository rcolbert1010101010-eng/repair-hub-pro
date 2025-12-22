import { cn } from '@/lib/utils';
import type { SalesOrderStatus, WorkOrderStatus, PurchaseOrderStatus } from '@/types';

type Status = SalesOrderStatus | WorkOrderStatus | PurchaseOrderStatus;

interface StatusBadgeProps {
  status: Status;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  className?: string;
}

const statusStyles: Record<Status, string> = {
  OPEN: 'status-badge status-open',
  IN_PROGRESS: 'status-badge status-in-progress',
  INVOICED: 'status-badge status-invoiced',
  CLOSED: 'status-badge status-invoiced',
};

const statusLabels: Record<Status, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  INVOICED: 'Invoiced',
  CLOSED: 'Closed',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(statusStyles[status], className)}>
      {statusLabels[status]}
    </span>
  );
}
