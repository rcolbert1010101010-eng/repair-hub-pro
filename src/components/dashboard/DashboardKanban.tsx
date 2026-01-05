import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReactNode } from 'react';

export interface DashboardKanbanItem {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  badges?: string[];
  onClick?: () => void;
}

export interface DashboardKanbanColumn {
  id: string;
  label: string;
  description?: string;
  items: DashboardKanbanItem[];
}

interface DashboardKanbanProps {
  columns: DashboardKanbanColumn[];
  loading?: boolean;
  emptyState?: ReactNode;
}

export function DashboardKanban({ columns, loading, emptyState }: DashboardKanbanProps) {
  if (loading) {
    return (
      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx}>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (columns.length === 0) {
    return <div>{emptyState}</div>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {columns.map((column) => (
        <Card key={column.id} className="h-full border border-muted/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {column.label}
            </CardTitle>
            {column.description && (
              <p className="text-xs text-muted-foreground">{column.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {column.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items.</p>
            ) : (
              column.items.map((item) => (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className="w-full rounded-lg border border-border/80 p-3 text-left transition hover:bg-muted"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{item.title}</p>
                    {item.badges && item.badges.length > 0 && (
                      <div className="flex items-center gap-1">
                        {item.badges.map((badge) => (
                          <Badge key={badge} variant="outline" className="text-[10px]">
                            {badge}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {item.subtitle && (
                    <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                  )}
                  {item.meta && <p className="text-xs text-muted-foreground">{item.meta}</p>}
                </button>
              ))
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
