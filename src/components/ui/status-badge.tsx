import { cn } from '@/lib/utils';
import type { 
  SalesOrderStatus, 
  WorkOrderStatus, 
  PurchaseOrderStatus, 
  ReturnStatus, 
  WarrantyClaimStatus 
} from '@/types';

// Derived status for POs that show partial receiving
export type DerivedPurchaseOrderStatus = PurchaseOrderStatus | 'PARTIALLY_RECEIVED';

type Status = 
  | SalesOrderStatus 
  | WorkOrderStatus 
  | PurchaseOrderStatus 
  | DerivedPurchaseOrderStatus
  | ReturnStatus 
  | WarrantyClaimStatus;

interface StatusBadgeProps {
  status: Status;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  className?: string;
}

const statusStyles: Record<Status, string> = {
  // Sales/Work Order statuses
  ESTIMATE: 'status-badge status-open',
  OPEN: 'status-badge status-open',
  PARTIAL: 'status-badge status-in-progress',
  COMPLETED: 'status-badge status-invoiced',
  CANCELLED: 'status-badge status-invoiced',
  IN_PROGRESS: 'status-badge status-in-progress',
  INVOICED: 'status-badge status-invoiced',
  CLOSED: 'status-badge status-invoiced',
  // PO derived status
  PARTIALLY_RECEIVED: 'status-badge status-in-progress',
  // Return statuses
  DRAFT: 'status-badge status-open',
  REQUESTED: 'status-badge status-open',
  APPROVED: 'status-badge status-in-progress',
  SHIPPED: 'status-badge status-in-progress',
  RECEIVED: 'status-badge status-in-progress',
  CREDITED: 'status-badge status-invoiced',
  // Warranty claim statuses
  SUBMITTED: 'status-badge status-open',
  DENIED: 'status-badge status-invoiced',
  PAID: 'status-badge status-invoiced',
};

const statusLabels: Record<Status, string> = {
  // Sales/Work Order statuses
  ESTIMATE: 'Estimate',
  OPEN: 'Open',
  PARTIAL: 'Partial',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  IN_PROGRESS: 'In Progress',
  INVOICED: 'Invoiced',
  CLOSED: 'Closed',
  // PO derived status
  PARTIALLY_RECEIVED: 'Partially Received',
  // Return statuses
  DRAFT: 'Draft',
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  SHIPPED: 'Shipped',
  RECEIVED: 'Received',
  CREDITED: 'Credited',
  // Warranty claim statuses
  SUBMITTED: 'Submitted',
  DENIED: 'Denied',
  PAID: 'Paid',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(statusStyles[status] || 'status-badge', className)}>
      {statusLabels[status] || status}
    </span>
  );
}

export type { Status };
