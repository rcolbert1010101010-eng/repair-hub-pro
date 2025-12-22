import { cn } from '@/lib/utils';
import type { SalesOrderStatus, WorkOrderStatus } from '@/types';

type Status = SalesOrderStatus | WorkOrderStatus;

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusStyles: Record<Status, string> = {
  OPEN: 'status-badge status-open',
  IN_PROGRESS: 'status-badge status-in-progress',
  INVOICED: 'status-badge status-invoiced',
};

const statusLabels: Record<Status, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  INVOICED: 'Invoiced',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(statusStyles[status], className)}>
      {statusLabels[status]}
    </span>
  );
}
