import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRepos } from '@/repos';
import type { Technician } from '@/types';
import { Badge } from '@/components/ui/badge';

export default function Technicians() {
  const navigate = useNavigate();
  const repos = useRepos();
  const { technicians } = repos.technicians;
  const { getActiveTimeEntry } = repos.timeEntries;
  const { workOrders } = repos.workOrders;

  const columns: Column<Technician>[] = [
    { key: 'name', header: 'Name', sortable: true },
    {
      key: 'hourly_cost_rate',
      header: 'Cost Rate',
      sortable: true,
      render: (item) => `$${item.hourly_cost_rate.toFixed(2)}/hr`,
      className: 'text-right',
    },
    {
      key: 'default_billable_rate',
      header: 'Billable Rate',
      sortable: true,
      render: (item) => item.default_billable_rate ? `$${item.default_billable_rate.toFixed(2)}/hr` : '-',
      className: 'text-right',
    },
    {
      key: 'id',
      header: 'Status',
      render: (item) => {
        const activeEntry = getActiveTimeEntry(item.id);
        if (activeEntry) {
          const wo = workOrders.find((w) => w.id === activeEntry.work_order_id);
          return <Badge variant="default">Clocked In: {wo?.order_number || 'Unknown'}</Badge>;
        }
        return <Badge variant="secondary">Available</Badge>;
      },
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Technicians"
        subtitle="Manage shop technicians"
        actions={
          <Button onClick={() => navigate('/technicians/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Technician
          </Button>
        }
      />

      <DataTable
        data={technicians}
        columns={columns}
        searchKeys={['name']}
        searchPlaceholder="Search technicians..."
        onRowClick={(tech) => navigate(`/technicians/${tech.id}`)}
        emptyMessage="No technicians found. Add your first technician to get started."
      />
    </div>
  );
}
