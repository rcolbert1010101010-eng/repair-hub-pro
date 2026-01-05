import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { ReactNode } from 'react';

export interface DashboardAlertItem {
  label: string;
  detail?: string;
}

export interface DashboardAlertGroup {
  title: string;
  count: number;
  description?: string;
  items?: DashboardAlertItem[];
  viewLabel?: string;
  onView?: () => void;
  id?: string;
}

interface DashboardAlertsRailProps {
  groups: DashboardAlertGroup[];
  loading?: boolean;
  emptyState?: ReactNode;
}

export function DashboardAlertsRail({ groups, loading, emptyState }: DashboardAlertsRailProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, idx) => (
          <Card key={idx}>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5" />
              <Skeleton className="h-5" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return <div>{emptyState}</div>;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Card key={group.id ?? group.title} className="border border-muted/50">
          <CardHeader className="pb-1">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">{group.title}</CardTitle>
                {group.description && (
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                )}
              </div>
              <Badge variant="secondary" className="text-xs font-semibold">
                {group.count}
              </Badge>
            </div>
            {group.onView && group.viewLabel && (
              <Button variant="link" size="sm" className="px-0 text-xs" onClick={group.onView}>
                {group.viewLabel}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2 pt-1">
            {group.items && group.items.length > 0 ? (
              <div className="space-y-1">
                {group.items.map((item) => (
                  <div key={item.label} className="rounded border border-muted/40 bg-muted/60 px-3 py-2">
                    <p className="text-sm font-medium">{item.label}</p>
                    {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No items to show</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
