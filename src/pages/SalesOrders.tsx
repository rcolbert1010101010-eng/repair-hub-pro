import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRepos } from '@/repos';
import type { SalesOrder } from '@/types';
import { StatusBadge } from '@/components/ui/status-badge';

export default function SalesOrders() {
  const navigate = useNavigate();
  const repos = useRepos();
  const { salesOrders } = repos.salesOrders;
  const { customers } = repos.customers;
  const [statusFilter, setStatusFilter] = useState<'open' | 'estimate' | 'invoiced' | 'deleted'>('open');

  const columns: Column<SalesOrder>[] = [
    { key: 'order_number', header: 'Order #', sortable: true, className: 'font-mono' },
    {
      key: 'customer_id',
      header: 'Customer',
      sortable: true,
      render: (item) => {
        const customer = customers.find((c) => c.id === item.customer_id);
        return customer?.company_name || '-';
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'total',
      header: 'Total',
      sortable: true,
      render: (item) => `$${item.total.toFixed(2)}`,
      className: 'text-right',
    },
    {
      key: 'created_at',
      header: 'Date',
      sortable: true,
      render: (item) => new Date(item.created_at).toLocaleDateString(),
    },
  ];

  const filteredSalesOrders = useMemo(() => {
    return salesOrders.filter((order) => {
      switch (statusFilter) {
        case 'open':
          return order.is_active !== false && order.status === 'OPEN';
        case 'estimate':
          return order.is_active !== false && order.status === 'ESTIMATE';
        case 'invoiced':
          return order.is_active !== false && order.status === 'INVOICED';
        case 'deleted':
          return order.is_active === false;
        default:
          return true;
      }
    });
  }, [salesOrders, statusFilter]);

  const tableData = useMemo(() => {
    if (statusFilter === 'deleted') {
      return filteredSalesOrders.map((order) => ({ ...order, is_active: true }));
    }
    return filteredSalesOrders;
  }, [filteredSalesOrders, statusFilter]);

  return (
    <div className="page-container">
      <PageHeader
        title="Sales Orders"
        subtitle="Manage counter sales and parts orders"
        actions={
          <Button onClick={() => navigate('/sales-orders/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New Sales Order
          </Button>
        }
      />

      <div className="flex justify-end gap-2 mb-4">
        {(['open', 'estimate', 'invoiced', 'deleted'] as const).map((filter) => (
          <Button
            key={filter}
            variant={statusFilter === filter ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(filter)}
          >
            {filter === 'open' && 'Open'}
            {filter === 'estimate' && 'Estimates'}
            {filter === 'invoiced' && 'Invoiced'}
            {filter === 'deleted' && 'Deleted'}
          </Button>
        ))}
      </div>

      <DataTable
        data={tableData}
        columns={columns}
        searchKeys={['order_number']}
        searchPlaceholder="Search orders..."
        onRowClick={(order) => navigate(`/sales-orders/${order.id}`)}
        emptyMessage="No sales orders found. Create your first sales order to get started."
      />
    </div>
  );
}
