import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/stat-card';
import { useShopStore } from '@/stores/shopStore';
import { Wrench, ShoppingCart, AlertTriangle, DollarSign } from 'lucide-react';
import { DataTable, Column } from '@/components/ui/data-table';
import type { Part } from '@/types';
import { useMemo } from 'react';

export default function Dashboard() {
  const { workOrders, salesOrders, parts, settings } = useShopStore();

  const stats = useMemo(() => {
    const openWorkOrders = workOrders.filter((o) => o.status !== 'INVOICED').length;
    const openSalesOrders = salesOrders.filter((o) => o.status !== 'INVOICED').length;
    const negativeInventory = parts.filter((p) => p.quantity_on_hand < 0 && p.is_active);
    
    // Calculate daily revenue (invoiced today)
    const today = new Date().toDateString();
    const dailyRevenue = [
      ...workOrders.filter((o) => o.invoiced_at && new Date(o.invoiced_at).toDateString() === today),
      ...salesOrders.filter((o) => o.invoiced_at && new Date(o.invoiced_at).toDateString() === today),
    ].reduce((sum, o) => sum + o.total, 0);

    return { openWorkOrders, openSalesOrders, negativeInventory, dailyRevenue };
  }, [workOrders, salesOrders, parts]);

  const negativeInventoryColumns: Column<Part>[] = [
    { key: 'part_number', header: 'Part #', sortable: true, className: 'font-mono' },
    { key: 'description', header: 'Description', sortable: true },
    {
      key: 'quantity_on_hand',
      header: 'QOH',
      sortable: true,
      render: (item) => (
        <span className="text-destructive font-medium">{item.quantity_on_hand}</span>
      ),
    },
  ];

  return (
    <div className="page-container">
      <PageHeader title="Dashboard" subtitle={settings.shop_name} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Open Work Orders"
          value={stats.openWorkOrders}
          icon={Wrench}
          variant="accent"
        />
        <StatCard
          title="Open Sales Orders"
          value={stats.openSalesOrders}
          icon={ShoppingCart}
          variant="default"
        />
        <StatCard
          title="Daily Revenue"
          value={`$${stats.dailyRevenue.toFixed(2)}`}
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          title="Negative Inventory"
          value={stats.negativeInventory.length}
          icon={AlertTriangle}
          variant={stats.negativeInventory.length > 0 ? 'warning' : 'default'}
        />
      </div>

      {stats.negativeInventory.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Negative Inventory Items</h2>
          <DataTable
            data={stats.negativeInventory}
            columns={negativeInventoryColumns}
            searchable={false}
            showActiveFilter={false}
            emptyMessage="No negative inventory"
          />
        </div>
      )}
    </div>
  );
}
