import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useManufacturingBuilds } from '@/hooks/useManufacturing';
import type { ManufacturingBuildWithRelations } from '@/integrations/supabase/manufacturing';
import type { ManufacturingBuildStatus } from '@/types';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

const STATUS_OPTIONS: Array<{ value: ManufacturingBuildStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'ENGINEERING', label: 'Engineering' },
  { value: 'FABRICATION', label: 'Fabrication' },
  { value: 'ASSEMBLY', label: 'Assembly' },
  { value: 'PAINT', label: 'Paint' },
  { value: 'QA', label: 'QA' },
  { value: 'READY', label: 'Ready' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function ManufacturingBuildsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<ManufacturingBuildStatus | 'all'>('all');
  const buildsQuery = useManufacturingBuilds(
    statusFilter === 'all' ? undefined : { status: statusFilter }
  );

  const columns: Column<ManufacturingBuildWithRelations>[] = useMemo(
    () => [
      { key: 'build_number', header: 'Build #' },
      {
        key: 'customer_name',
        header: 'Customer',
        render: (build) => build.customer?.company_name ?? 'Unassigned',
      },
      {
        key: 'product_name',
        header: 'Product',
        render: (build) => build.product?.name ?? '—',
      },
      { key: 'status', header: 'Status' },
      {
        key: 'serial_number',
        header: 'Serial',
        render: (build) => build.serial_number ?? '—',
      },
      {
        key: 'created_at',
        header: 'Created',
        render: (build) => new Date(build.created_at).toLocaleDateString(),
      },
      {
        key: 'is_active',
        header: 'Active',
        render: (build) => (build.is_active ? 'Yes' : 'No'),
      },
    ],
    []
  );

  const tableData = useMemo(
    () =>
      (buildsQuery.data ?? []).map((build) => ({
        ...build,
        customer_name: build.customer?.company_name ?? '',
        product_name: build.product?.name ?? '',
      })),
    [buildsQuery.data]
  );

  const statusLabel = STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label ?? 'Status';

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Manufacturing Builds"
        subtitle="Track the lifecycle of each build"
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">{statusLabel}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {STATUS_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setStatusFilter(option.value)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => navigate('/manufacturing/builds/new')}>
              <Plus className="w-4 h-4 mr-2" />
              New Build
            </Button>
          </div>
        }
      />

      <DataTable
        data={tableData}
        columns={columns}
        searchKeys={['build_number', 'customer_name', 'product_name']}
        searchPlaceholder="Search builds..."
        onRowClick={(build) => navigate(`/manufacturing/builds/${build.id}`)}
        emptyMessage={buildsQuery.isLoading ? 'Loading builds...' : 'No builds yet'}
      />
    </div>
  );
}
