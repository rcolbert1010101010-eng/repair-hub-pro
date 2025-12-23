import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useShopStore } from '@/stores/shopStore';
import type { SalesOrder, Customer } from '@/types';
import { StatusBadge } from '@/components/ui/status-badge';
import { fetchCustomers } from '@/integrations/supabase/customers';

export default function SalesOrders() {
  const navigate = useNavigate();
  const { salesOrders } = useShopStore();
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const fetched = await fetchCustomers();
        if (!isMounted) return;
        setCustomers(fetched);
      } catch (e) {
        console.error('Failed to load customers', e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

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

      <DataTable
        data={salesOrders}
        columns={columns}
        searchKeys={['order_number']}
        searchPlaceholder="Search orders..."
        onRowClick={(order) => navigate(`/sales-orders/${order.id}`)}
        showActiveFilter={false}
        emptyMessage="No sales orders found. Create your first sales order to get started."
      />
    </div>
  );
}
