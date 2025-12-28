import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRepos } from '@/repos';
import type { Part } from '@/types';
import { cn } from '@/lib/utils';

export default function Inventory() {
  const navigate = useNavigate();
  const repos = useRepos();
  const { parts } = repos.parts;
  const { vendors } = repos.vendors;
  const { categories } = repos.categories;

  const columns: Column<Part>[] = [
    { key: 'part_number', header: 'Part #', sortable: true, className: 'font-mono' },
    { key: 'description', header: 'Description', sortable: true },
    {
      key: 'category_id',
      header: 'Category',
      sortable: true,
      render: (item) => {
        const category = categories.find((c) => c.id === item.category_id);
        return category?.category_name || '-';
      },
    },
    {
      key: 'bin_location',
      header: 'Bin',
      sortable: false,
      render: (item) => item.bin_location || '—',
    },
    {
      key: 'vendor_id',
      header: 'Vendor',
      sortable: true,
      render: (item) => {
        const vendor = vendors.find((v) => v.id === item.vendor_id);
        return vendor?.vendor_name || '-';
      },
    },
    {
      key: 'cost',
      header: 'Cost',
      sortable: true,
      render: (item) => `$${item.cost.toFixed(2)}`,
      className: 'text-right',
    },
    {
      key: 'selling_price',
      header: 'Price',
      sortable: true,
      render: (item) => `$${item.selling_price.toFixed(2)}`,
      className: 'text-right',
    },
    {
      key: 'min_qty',
      header: 'Min',
      sortable: false,
      render: (item) => (item.min_qty ?? '—'),
      className: 'text-right',
    },
    {
      key: 'max_qty',
      header: 'Max',
      sortable: false,
      render: (item) => (item.max_qty ?? '—'),
      className: 'text-right',
    },
    {
      key: 'quantity_on_hand',
      header: 'QOH',
      sortable: true,
      render: (item) => (
        <span
          className={cn(
            'font-medium',
            item.quantity_on_hand < 0 && 'text-destructive',
            item.quantity_on_hand === 0 && 'text-warning'
          )}
        >
          {item.quantity_on_hand}
        </span>
      ),
      className: 'text-right',
    },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Inventory"
        subtitle="Manage parts and stock levels"
        actions={
          <Button onClick={() => navigate('/inventory/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Add Part
          </Button>
        }
      />

      <DataTable
        data={parts}
        columns={columns}
        searchKeys={['part_number', 'description']}
        searchPlaceholder="Search parts..."
        onRowClick={(part) => navigate(`/inventory/${part.id}`)}
        emptyMessage="No parts found. Add your first part to get started."
      />
    </div>
  );
}
