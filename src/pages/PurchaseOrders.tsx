import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { useRepos } from '@/repos';
import type { PurchaseOrder } from '@/types';

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const repos = useRepos();
  const { purchaseOrders } = repos.purchaseOrders;
  const { vendors } = repos.vendors;

  const columns: Column<PurchaseOrder>[] = [
    { key: 'po_number', header: 'PO #', sortable: true, className: 'font-mono' },
    {
      key: 'vendor_id',
      header: 'Vendor',
      sortable: true,
      render: (item) => vendors.find((v) => v.id === item.vendor_id)?.vendor_name || '-',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={item.status} variant={item.status === 'CLOSED' ? 'success' : 'warning'} />
          {item.notes?.includes('Auto-generated') && (
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              AUTO
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (item) => new Date(item.created_at).toLocaleDateString(),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Purchase Orders"
        subtitle="Manage vendor orders and receiving"
        actions={
          <Button onClick={() => navigate('/purchase-orders/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New PO
          </Button>
        }
      />

      <DataTable
        data={purchaseOrders}
        columns={columns}
        searchKeys={['po_number']}
        searchPlaceholder="Search purchase orders..."
        onRowClick={(po) => navigate(`/purchase-orders/${po.id}`)}
        emptyMessage="No purchase orders found."
        showActiveFilter={false}
      />
    </div>
  );
}
