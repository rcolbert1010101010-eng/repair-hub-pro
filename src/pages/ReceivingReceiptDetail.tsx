import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { useShopStore } from '@/stores/shopStore';
import { useRepos } from '@/repos';

export default function ReceivingReceiptDetail() {
  const { id } = useParams<{ id: string }>();
  const receipt = useShopStore((s) => s.receivingReceipts.find((r) => r.id === id));
  const parts = useRepos().parts.parts;
  const vendors = useRepos().vendors.vendors;

  const rows = useMemo(() => {
    if (!receipt) return [];
    return receipt.lines.map((l) => {
      const part = parts.find((p) => p.id === l.part_id);
      return { line: l, part };
    });
  }, [parts, receipt]);

  if (!receipt) {
    return (
      <div className="page-container">
        <PageHeader title="Receipt Not Found" backTo="/receiving-history" />
        <p className="text-muted-foreground">This receiving receipt does not exist.</p>
      </div>
    );
  }

  const vendor = vendors.find((v) => v.id === receipt.vendor_id);

  return (
    <div className="page-container space-y-4">
      <PageHeader title="Receiving Receipt" subtitle={receipt.reference || 'Receipt'} backTo="/receiving-history" />

      <Card className="p-4 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-muted-foreground">Received At</div>
            <div className="font-medium">{new Date(receipt.received_at).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Received By</div>
            <div className="font-medium">{receipt.received_by || '—'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Vendor</div>
            <div className="font-medium">{vendor?.vendor_name || '—'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Reference</div>
            <div className="font-medium">{receipt.reference || '—'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Source</div>
            <div className="font-medium">
              {receipt.source_type === 'PURCHASE_ORDER' && receipt.source_id ? (
                <Link to={`/purchase-orders/${receipt.source_id}`} className="text-primary hover:underline">
                  Purchase Order
                </Link>
              ) : (
                'Manual'
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">Part #</th>
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Unit Cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ line, part }) => (
                <tr key={`${line.part_id}-${line.qty}`} className="border-t border-border/60">
                  <td className="py-2 font-mono">{part?.part_number || line.part_id}</td>
                  <td className="py-2">{part?.description || '—'}</td>
                  <td className="py-2 text-right">{line.quantity}</td>
                  <td className="py-2 text-right">{line.unit_cost != null ? line.unit_cost : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
