import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRepos } from '@/repos';
import type { Part } from '@/types';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function Inventory() {
  const navigate = useNavigate();
  const repos = useRepos();
  const { parts } = repos.parts;
  const { vendors } = repos.vendors;
  const { categories } = repos.categories;
  const { toast } = useToast();
  const [scanValue, setScanValue] = useState('');
  const scanInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleScan = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      const matched =
        parts.find((p) => p.barcode && p.barcode === trimmed) ||
        parts.find((p) => p.part_number === trimmed);
      if (matched) {
        navigate(`/inventory/${matched.id}`);
      } else {
        toast({ title: 'Barcode not found', description: 'No matching part for scanned value' });
      }
      setScanValue('');
    },
    [navigate, parts, toast]
  );

  useEffect(() => {
    if (!scanValue) return;
    const timer = setTimeout(() => handleScan(scanValue), 200);
    return () => clearTimeout(timer);
  }, [scanValue, handleScan]);

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

      <div className="flex items-center gap-2 mb-4">
        <Input
          ref={scanInputRef}
          placeholder="Scan barcode"
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleScan(scanValue);
            }
          }}
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" onClick={() => scanInputRef.current?.focus()}>
          Focus Scan
        </Button>
      </div>

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
