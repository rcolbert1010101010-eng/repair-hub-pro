import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';

interface DashboardKpiCardProps {
  title: string;
  value: string | number;
  meta?: string[];
  description?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'primary' | 'warning' | 'success';
  onClick?: () => void;
}

const toneStyles: Record<DashboardKpiCardProps['tone'], string> = {
  default: 'border border-border',
  primary: 'border border-primary/40 bg-primary/5',
  warning: 'border border-amber-300 bg-amber-50',
  success: 'border border-emerald-400 bg-emerald-50',
};

export function DashboardKpiCard({
  title,
  value,
  meta,
  description,
  icon: Icon,
  tone = 'default',
  onClick,
}: DashboardKpiCardProps) {
  return (
    <Card
      className={cn(
        'h-full cursor-pointer transition hover:shadow-lg',
        toneStyles[tone],
        !onClick && 'cursor-default hover:shadow-none'
      )}
      onClick={onClick}
    >
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-3xl font-semibold leading-tight text-foreground">{value}</p>
          {onClick && <ArrowUpRight className="text-muted-foreground" />}
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {meta && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            {meta.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
