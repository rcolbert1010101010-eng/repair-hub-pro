import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRepos } from '@/repos';
import type { Unit } from '@/types';

export default function Units() {
  const navigate = useNavigate();
  const repos = useRepos();
  const { units } = repos.units;
  const { customers } = repos.customers;

  const columns: Column<Unit>[] = [
    { key: 'unit_name', header: 'Unit Name', sortable: true },
    {
      key: 'customer_id',
      header: 'Customer',
      sortable: true,
      render: (item) => {
        const customer = customers.find((c) => c.id === item.customer_id);
        return customer?.company_name || '-';
      },
    },
    { key: 'vin', header: 'VIN', sortable: true, className: 'font-mono text-xs' },
    { key: 'year', header: 'Year', sortable: true },
    { key: 'make', header: 'Make', sortable: true },
    { key: 'model', header: 'Model', sortable: true },
    {
      key: 'mileage',
      header: 'Mileage/Hours',
      render: (item) => {
        if (item.mileage) return `${item.mileage.toLocaleString()} mi`;
        if (item.hours) return `${item.hours.toLocaleString()} hrs`;
        return '-';
      },
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Units / Equipment"
        subtitle="Manage customer equipment and vehicles"
        actions={
          <Button onClick={() => navigate('/units/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Unit
          </Button>
        }
      />

      <DataTable
        data={units}
        columns={columns}
        searchKeys={['unit_name', 'vin', 'make', 'model']}
        searchPlaceholder="Search units..."
        onRowClick={(unit) => navigate(`/units/${unit.id}`)}
        emptyMessage="No units found. Add your first unit to get started."
      />
    </div>
  );
}
