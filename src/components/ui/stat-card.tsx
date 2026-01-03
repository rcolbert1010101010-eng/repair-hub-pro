import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'warning' | 'success' | 'accent';
  valueClassName?: string;
}

const variantStyles = {
  default: 'border-border',
  warning: 'border-warning/30 bg-warning/5',
  success: 'border-success/30 bg-success/5',
  accent: 'border-accent/30 bg-accent/5',
};

const iconVariantStyles = {
  default: 'bg-secondary text-secondary-foreground',
  warning: 'bg-warning/20 text-warning',
  success: 'bg-success/20 text-success',
  accent: 'bg-accent/20 text-accent',
};

export function StatCard({ title, value, icon: Icon, trend, variant = 'default', valueClassName }: StatCardProps) {
  return (
    <div className={cn('stat-card border overflow-hidden min-w-0', variantStyles[variant])}>
      <div className="flex items-center justify-between gap-2 min-w-0">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <div className={cn('p-2 rounded-lg', iconVariantStyles[variant])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-end justify-between gap-2 overflow-hidden min-w-0">
        <div
          className={cn(
            'text-3xl sm:text-4xl font-semibold break-words leading-tight max-w-full line-clamp-2',
            valueClassName
          )}
        >
          {value}
        </div>
        {trend && (
          <span
            className={cn(
              'text-sm font-medium',
              trend.isPositive ? 'text-success' : 'text-destructive'
            )}
          >
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
    </div>
  );
}
