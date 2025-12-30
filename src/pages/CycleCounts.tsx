import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { useRepos } from '@/repos';
import type { CycleCountSession } from '@/types';

export default function CycleCounts() {
  const navigate = useNavigate();
  const { cycleCountSessions, createCycleCountSession } = useRepos().cycleCounts;

  const columns: Column<CycleCountSession>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (item) => item.title || 'Untitled',
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <Badge variant={item.status === 'POSTED' ? 'default' : item.status === 'CANCELLED' ? 'secondary' : 'outline'}>{item.status}</Badge>,
      sortable: true,
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (item) => new Date(item.created_at).toLocaleString(),
      sortable: true,
    },
    {
      key: 'posted_at',
      header: 'Posted',
      render: (item) => (item.posted_at ? new Date(item.posted_at).toLocaleString() : '—'),
      sortable: true,
    },
  ];

  const handleNew = () => {
    const session = createCycleCountSession({ created_by: 'system' });
    navigate(`/cycle-counts/${session.id}`);
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Cycle Counts"
        subtitle="Track and post stock counts"
        actions={
          <Button onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" />
            New Cycle Count
          </Button>
        }
      />

      <DataTable
        data={cycleCountSessions}
        columns={columns}
        searchKeys={['title', 'status']}
        searchPlaceholder="Search cycle counts..."
        onRowClick={(session) => navigate(`/cycle-counts/${session.id}`)}
        emptyMessage="No cycle counts yet. Start a new session to begin counting."
      />
    </div>
  );
}
