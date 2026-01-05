import { cn } from '@/lib/utils';
import type { SalesOrderStatus, WorkOrderStatus, PurchaseOrderStatus } from '@/types';

type Status = SalesOrderStatus | WorkOrderStatus | PurchaseOrderStatus;

interface StatusBadgeProps {
  status: Status;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  className?: string;
}

const statusStyles: Record<Status, string> = {
  ESTIMATE: 'status-badge status-open',
  OPEN: 'status-badge status-open',
  PARTIAL: 'status-badge status-in-progress',
  COMPLETED: 'status-badge status-invoiced',
  CANCELLED: 'status-badge status-invoiced',
  IN_PROGRESS: 'status-badge status-in-progress',
  INVOICED: 'status-badge status-invoiced',
  CLOSED: 'status-badge status-invoiced',
};

const statusLabels: Record<Status, string> = {
  ESTIMATE: 'Estimate',
  OPEN: 'Open',
  PARTIAL: 'Partial',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
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
