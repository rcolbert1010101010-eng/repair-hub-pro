import { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { useRepos } from '@/repos';
import { getPurchaseOrderDerivedStatus } from '@/services/purchaseOrderStatus';

interface PurchaseOrderPreviewDialogProps {
  poId: string;
  trigger: React.ReactNode;
}

export function PurchaseOrderPreviewDialog({ poId, trigger }: PurchaseOrderPreviewDialogProps) {
  const repos = useRepos();
  const { purchaseOrders, getPurchaseOrderLines } = repos.purchaseOrders;
  const { vendors } = repos.vendors;
  const { parts } = repos.parts;

  const order = purchaseOrders.find((po) => po.id === poId);
  const lines = useMemo(() => (order ? getPurchaseOrderLines(order.id) : []), [getPurchaseOrderLines, order]);
  const derivedStatus = useMemo(
    () => (order ? getPurchaseOrderDerivedStatus(order, lines) : 'OPEN'),
    [order, lines]
  );
  const vendor = order ? vendors.find((v) => v.id === order.vendor_id) : undefined;

  if (!order) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>
              {order.po_number || order.id}
              {vendor?.vendor_name ? ` · ${vendor.vendor_name}` : ''}
            </span>
            <StatusBadge status={derivedStatus} variant={derivedStatus === 'RECEIVED' ? 'success' : 'warning'} />
          </DialogTitle>
          <DialogDescription>
            Review purchase order details.{' '}
            <Button asChild variant="link" size="sm" className="px-0 h-auto">
              <a href={`/purchase-orders/${order.id}`} target="_blank" rel="noreferrer">
                Open full PO page
              </a>
            </Button>
          </DialogDescription>
        </DialogHeader>

        {order.notes && (
          <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">{order.notes}</p>
        )}

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part #</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Ordered</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No lines on this PO.
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((line) => {
                  const part = parts.find((p) => p.id === line.part_id);
                  return (
                    <TableRow key={line.id}>
                      <TableCell className="font-mono">{part?.part_number || '-'}</TableCell>
                      <TableCell>{part?.description || '-'}</TableCell>
                      <TableCell className="text-right">{line.ordered_quantity}</TableCell>
                      <TableCell className="text-right">{line.received_quantity}</TableCell>
                      <TableCell className="text-right">${line.unit_cost.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
