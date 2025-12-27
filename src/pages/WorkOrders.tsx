import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRepos } from '@/repos';
import type { WorkOrder } from '@/types';
import { StatusBadge } from '@/components/ui/status-badge';

export default function WorkOrders() {
  const navigate = useNavigate();
  const repos = useRepos();
  const { workOrders } = repos.workOrders;
  const { customers } = repos.customers;
  const { units } = repos.units;

  const columns: Column<WorkOrder>[] = [
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
      key: 'unit_id',
      header: 'Unit',
      sortable: true,
      render: (item) => {
        const unit = units.find((u) => u.id === item.unit_id);
        return unit?.unit_name || '-';
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

  return (
    <div className="page-container">
      <PageHeader
        title="Work Orders"
        subtitle="Manage repair and service work orders"
        actions={
          <Button onClick={() => navigate('/work-orders/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New Work Order
          </Button>
        }
      />

      <DataTable
        data={workOrders}
        columns={columns}
        searchKeys={['order_number']}
        searchPlaceholder="Search orders..."
        onRowClick={(order) => navigate(`/work-orders/${order.id}`)}
        showActiveFilter={false}
        emptyMessage="No work orders found. Create your first work order to get started."
      />
    </div>
  );
}
