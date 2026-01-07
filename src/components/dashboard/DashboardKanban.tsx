import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, type ReactNode, type DragEvent } from 'react';

export interface DashboardKanbanBadge {
  label: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export interface DashboardKanbanItem {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  badges?: DashboardKanbanBadge[];
  ageLabel?: string;
  slaBadge?: DashboardKanbanBadge;
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
  layout?: 'grid' | 'kanban';
  onItemMove?: (itemId: string, fromColumnId: string, toColumnId: string) => void;
}

export function DashboardKanban({ columns, loading, emptyState, layout = 'grid', onItemMove }: DashboardKanbanProps) {
  const isKanban = layout === 'kanban';
  const [draggedItem, setDraggedItem] = useState<{ itemId: string; columnId: string } | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const handleDragStart = (e: DragEvent, itemId: string, columnId: string) => {
    if (!isKanban) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ itemId, columnId }));
    setDraggedItem({ itemId, columnId });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverColumnId(null);
  };

  const handleDragOver = (e: DragEvent, columnId: string) => {
    if (!isKanban || !draggedItem) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    // Only clear if leaving the column entirely (not entering a child)
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverColumnId(null);
    }
  };

  const handleDrop = (e: DragEvent, toColumnId: string) => {
    if (!isKanban) return;
    e.preventDefault();
    setDragOverColumnId(null);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { itemId, columnId: fromColumnId } = data;
      
      if (fromColumnId !== toColumnId && onItemMove) {
        onItemMove(itemId, fromColumnId, toColumnId);
      }
    } catch {
      // Invalid data, ignore
    }
    
    setDraggedItem(null);
  };

  if (loading) {
    return (
      <div className={isKanban ? "flex gap-4 overflow-x-auto pb-2" : "grid w-full grid-cols-1 gap-4 lg:grid-cols-3 xl:grid-cols-4"}>
        {Array.from({ length: isKanban ? 7 : 4 }).map((_, idx) => (
          <Card key={idx} className={isKanban ? "min-w-[260px] flex-shrink-0" : ""}>
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
    <div className={isKanban ? "flex gap-4 overflow-x-auto pb-2" : "grid gap-4 lg:grid-cols-2 xl:grid-cols-3"}>
      {columns.map((column) => (
        <Card
          key={column.id}
          className={`
            ${isKanban ? "min-w-[260px] max-w-[300px] flex-shrink-0" : ""} 
            h-full border border-muted/40 transition-colors
            ${isKanban && dragOverColumnId === column.id && draggedItem?.columnId !== column.id ? "border-primary/50 bg-primary/5" : ""}
          `}
          onDragOver={(e) => handleDragOver(e, column.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {column.label}
              </CardTitle>
              {isKanban && (
                <Badge variant="secondary" className="text-xs">
                  {column.items.length}
                </Badge>
              )}
            </div>
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
                  draggable={isKanban}
                  onDragStart={(e) => handleDragStart(e, item.id, column.id)}
                  onDragEnd={handleDragEnd}
                  className={`
                    relative w-full overflow-hidden rounded-lg border border-border/80 p-3 text-left transition hover:bg-muted
                    ${isKanban ? "cursor-grab active:cursor-grabbing" : ""}
                    ${draggedItem?.itemId === item.id ? "opacity-50" : ""}
                  `}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{item.title}</p>
                    <div className="flex items-center gap-1">
                      {item.ageLabel && (
                        <span className="text-[11px] font-mono uppercase text-muted-foreground">
                          {item.ageLabel}
                        </span>
                      )}
                      {item.slaBadge && (
                        <Badge variant={item.slaBadge.variant ?? 'destructive'} className="text-[10px]">
                          {item.slaBadge.label}
                        </Badge>
                      )}
                      {item.badges &&
                        item.badges.length > 0 &&
                        item.badges.map((badge) => (
                          <Badge
                            key={badge.label}
                            variant={badge.variant ?? 'outline'}
                            className="text-[10px]"
                          >
                            {badge.label}
                          </Badge>
                        ))}
                    </div>
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
