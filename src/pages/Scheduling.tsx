import { useMemo, useState } from 'react';
import { CalendarDays, Clock, User, AlertTriangle, Plus, ChevronLeft, ChevronRight, ClipboardList, Wrench, Info } from 'lucide-react';
import { useRepos } from '@/repos';
import type { ScheduleItem, ScheduleItemStatus } from '@/types';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const DAILY_CAPACITY_MINUTES = 480;

type FormState = {
  workOrderId: string;
  technicianId: string;
  start: string;
  durationHours: number;
  status: ScheduleItemStatus;
  partsReady: boolean;
  priority: number;
  promised: string;
  notes: string;
};

const statusStyles: Record<ScheduleItemStatus, string> = {
  ON_TRACK: 'border bg-muted text-muted-foreground',
  AT_RISK: 'border bg-amber-100 text-amber-900 dark:bg-amber-900/20 dark:text-amber-100',
  LATE: 'border bg-destructive/10 text-destructive',
  IN_PROGRESS: 'border bg-accent text-accent-foreground',
  WAITING_APPROVAL: 'border bg-muted text-muted-foreground',
  WAITING_PARTS: 'border bg-muted text-muted-foreground',
  QA: 'border bg-muted text-muted-foreground',
};

const statusLabels: Record<ScheduleItemStatus, string> = {
  ON_TRACK: 'On Track',
  AT_RISK: 'At Risk',
  LATE: 'Late',
  IN_PROGRESS: 'In Progress',
  WAITING_APPROVAL: 'Waiting Approval',
  WAITING_PARTS: 'Waiting Parts',
  QA: 'QA',
};

const toLocalInput = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 16);
};

const getWeekStart = (date: Date) => {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diff);
  return start;
};

const formatShortDate = (date: Date) =>
  date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const sameDay = (a: string, day: Date) => {
  const d = new Date(a);
  return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
};

const formatTimeRange = (item: ScheduleItem) => {
  const start = new Date(item.start_at);
  const end = new Date(start.getTime() + item.duration_minutes * 60000);
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  return `${start.toLocaleTimeString([], opts)} – ${end.toLocaleTimeString([], opts)}`;
};

const defaultFormState = (): FormState => {
  const nextHour = new Date();
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);
  return {
    workOrderId: '',
    technicianId: '',
    start: toLocalInput(nextHour),
    durationHours: 2,
    status: 'ON_TRACK',
    partsReady: false,
    priority: 3,
    promised: '',
    notes: '',
  };
};

export default function Scheduling() {
  const repos = useRepos();
  const schedulingRepo = repos.scheduling;
  const { workOrders } = repos.workOrders;
  const { customers } = repos.customers;
  const { units } = repos.units;
  const { technicians } = repos.technicians;

  const scheduleItems = schedulingRepo.list();

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'DAY' | 'WEEK'>('DAY');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [formError, setFormError] = useState<string | null>(null);

  const startDate = useMemo(() => {
    const base = new Date(currentDate);
    base.setHours(0, 0, 0, 0);
    return base;
  }, [currentDate]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, idx) => {
    const base = viewMode === 'WEEK' ? getWeekStart(startDate) : startDate;
    const date = new Date(base);
    date.setDate(base.getDate() + idx);
    return date;
  }), [startDate, viewMode]);

  const workOrderMap = useMemo(() => new Map(workOrders.map((wo) => [wo.id, wo])), [workOrders]);
  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const technicianMap = useMemo(() => new Map(technicians.map((t) => [t.id, t])), [technicians]);

  const getWorkOrderLabel = (id: string) => {
    const wo = workOrderMap.get(id);
    if (!wo) return `Work Order ${id}`;
    const customer = wo.customer_id ? customerMap.get(wo.customer_id) : null;
    const unit = wo.unit_id ? unitMap.get(wo.unit_id) : null;
    const unitLabel = unit?.unit_name || [unit?.year, unit?.make, unit?.model].filter(Boolean).join(' ');
    return `${wo.order_number} • ${customer?.company_name ?? 'Customer'} ${unitLabel ? `• ${unitLabel}` : ''}`.trim();
  };

  const getTechnicianLabel = (id: string | null) => {
    if (!id) return 'Unassigned';
    return technicianMap.get(id)?.name ?? 'Unknown tech';
  };

  const formatConflict = (conflict: ScheduleItem) => {
    const techName = getTechnicianLabel(conflict.technician_id);
    const woLabel = getWorkOrderLabel(conflict.source_ref_id);
    const dateLabel = formatShortDate(new Date(conflict.start_at));
    return {
      title: `Overlap for ${techName}`,
      details: `${woLabel} • ${dateLabel} • ${formatTimeRange(conflict)}`,
    };
  };

  const conflictDetailsMap = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    scheduleItems.forEach((item) => {
      map.set(item.id, schedulingRepo.detectConflicts(item));
    });
    return map;
  }, [scheduleItems, schedulingRepo]);

  const weekItems = useMemo(
    () =>
      (viewMode === 'WEEK' ? weekDays : [startDate]).map((day) =>
        scheduleItems
          .filter((item) => sameDay(item.start_at, day))
          .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
      ),
    [scheduleItems, startDate, viewMode, weekDays]
  );

  const currentWeekLabel = `${formatShortDate(getWeekStart(startDate))} – ${formatShortDate(
    new Date(new Date(getWeekStart(startDate)).setDate(getWeekStart(startDate).getDate() + 6))
  )}`;
  const currentDayLabel = `${startDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}`;

  const handleOpenNew = () => {
    setEditingId(null);
    setFormState(defaultFormState());
    setFormError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: ScheduleItem) => {
    setEditingId(item.id);
    setFormState({
      workOrderId: item.source_ref_id,
      technicianId: item.technician_id ?? '',
      start: toLocalInput(item.start_at),
      durationHours: Number((item.duration_minutes / 60).toFixed(2)),
      status: item.status,
      partsReady: item.parts_ready,
      priority: item.priority,
      promised: item.promised_at ? toLocalInput(item.promised_at) : '',
      notes: item.notes ?? '',
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const durationMinutes = Math.max(15, Math.round(Number(formState.durationHours || 0) * 60));
  const isoStart = formState.start ? new Date(formState.start).toISOString() : '';
  const isoPromised = formState.promised ? new Date(formState.promised).toISOString() : null;

  const dialogConflicts = useMemo(() => {
    if (!dialogOpen || !isoStart || !formState.technicianId) return [];
    return schedulingRepo.detectConflicts({
      id: editingId,
      technician_id: formState.technicianId || null,
      start_at: isoStart,
      duration_minutes: durationMinutes,
    } as ScheduleItem);
  }, [dialogOpen, isoStart, formState.technicianId, durationMinutes, editingId, schedulingRepo]);
  const hasDialogConflicts = dialogConflicts.length > 0;
  const dialogConflictSummary = dialogConflicts[0] ? formatConflict(dialogConflicts[0]) : null;

  const saveScheduleItem = () => {
    if (!formState.workOrderId) {
      setFormError('Work order is required.');
      return;
    }
    if (!formState.start) {
      setFormError('Start time is required.');
      return;
    }

    const priority = Math.min(5, Math.max(1, Math.round(formState.priority))) as ScheduleItem['priority'];

    const payload: Omit<ScheduleItem, 'id' | 'created_at' | 'updated_at'> & { id?: string } = {
      id: editingId ?? undefined,
      source_ref_type: 'WORK_ORDER',
      source_ref_id: formState.workOrderId,
      technician_id: formState.technicianId || null,
      start_at: isoStart,
      duration_minutes: durationMinutes,
      priority,
      promised_at: isoPromised,
      parts_ready: formState.partsReady,
      status: formState.status,
      notes: formState.notes.trim() ? formState.notes.trim() : null,
    };

    if (editingId) {
      schedulingRepo.update(editingId, payload);
    } else {
      schedulingRepo.create(payload);
    }

    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (editingId && window.confirm('Remove this scheduled item?')) {
      schedulingRepo.remove(editingId);
      setDialogOpen(false);
    }
  };

  const adjustDate = (deltaDays: number) => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + deltaDays);
      return next;
    });
  };

  const goToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCurrentDate(today);
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Scheduling"
        subtitle="Plan technician workload for the week."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border">
              {(['DAY', 'WEEK'] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? 'default' : 'ghost'}
                  size="sm"
                  className={viewMode === mode ? '' : 'bg-transparent'}
                  onClick={() => setViewMode(mode)}
                >
                  {mode === 'DAY' ? 'Day' : 'Week'}
                </Button>
              ))}
            </div>
            <Button onClick={handleOpenNew}>
              <Plus className="w-4 h-4 mr-2" />
              New Scheduled Item
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{viewMode === 'WEEK' ? 'Week of' : 'Day'}</p>
              <p className="text-lg font-semibold">
                {viewMode === 'WEEK' ? currentWeekLabel : currentDayLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjustDate(viewMode === 'WEEK' ? -7 : -1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjustDate(viewMode === 'WEEK' ? 7 : 1)}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToday}>
              Today
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className={cn('grid gap-3 md:gap-4', viewMode === 'WEEK' ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2 xl:grid-cols-2')}>
        {(viewMode === 'WEEK' ? weekDays : [startDate]).map((day, idx) => {
          const itemsForDay = weekItems[idx] ?? [];
          const itemsByTech = itemsForDay.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
            const key = item.technician_id || 'unassigned';
            acc[key] = acc[key] || [];
            acc[key].push(item);
            return acc;
          }, {});
          const techKeys = Object.keys(itemsByTech);

          return (
            <Card key={day.toISOString()} className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{day.toLocaleDateString(undefined, { weekday: 'long' })}</CardTitle>
                    <p className="text-sm text-muted-foreground">{formatShortDate(day)}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {itemsForDay.length} item{itemsForDay.length === 1 ? '' : 's'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {itemsForDay.length === 0 && (
                  <p className="text-sm text-muted-foreground">No scheduled work.</p>
                )}
                {viewMode === 'DAY'
                  ? techKeys.map((techId) => {
                      const groupItems = itemsByTech[techId];
                      const tech = technicianMap.get(techId) ?? null;
                      const loadMinutes = groupItems.reduce((sum, item) => sum + item.duration_minutes, 0);
                      const overCap = loadMinutes > DAILY_CAPACITY_MINUTES;
                      const loadHours = (loadMinutes / 60).toFixed(1);

                      return (
                        <div key={techId} className="space-y-2 rounded-lg border p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-semibold">{tech?.name || 'Unassigned'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className={cn('px-2 py-0.5', overCap ? 'border-destructive text-destructive' : '')}>
                                Load: {loadHours}h
                              </Badge>
                              {overCap && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertTriangle className="w-3 h-3 text-destructive" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-medium text-destructive">Over capacity</p>
                                    <p className="text-xs text-muted-foreground">Daily capacity is 8h. Adjust schedule.</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            {groupItems.map((item) => {
                              const conflicts = conflictDetailsMap.get(item.id) ?? [];
                              const hasConflict = conflicts.length > 0;
                              const conflictSummary = conflicts[0] ? formatConflict(conflicts[0]) : null;
                              return (
                                <Tooltip key={item.id}>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEdit(item)}
                                      className={cn(
                                        'w-full rounded-lg border p-3 text-left transition hover:border-primary hover:bg-accent',
                                        hasConflict ? 'border-destructive/50 bg-destructive/10 ring-1 ring-destructive/40' : ''
                                      )}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <Badge className={cn('px-2 py-0.5 text-xs', statusStyles[item.status])}>{statusLabels[item.status]}</Badge>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <Clock className="w-3 h-3" />
                                          <span>{formatTimeRange(item)}</span>
                                          {hasConflict && conflictSummary && (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <AlertTriangle className="w-3 h-3 text-destructive" />
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p className="font-medium">{conflictSummary.title}</p>
                                                <p className="text-xs text-muted-foreground">{conflictSummary.details}</p>
                                                {conflicts.length > 1 && (
                                                  <p className="text-xs text-muted-foreground">+{conflicts.length - 1} more overlap</p>
                                                )}
                                              </TooltipContent>
                                            </Tooltip>
                                          )}
                                        </div>
                                      </div>
                                      <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                                        <ClipboardList className="w-4 h-4 text-primary" />
                                        <span className="truncate">{getWorkOrderLabel(item.source_ref_id)}</span>
                                      </div>
                                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                          <User className="w-3 h-3" />
                                          <span>{getTechnicianLabel(item.technician_id)}</span>
                                        </div>
                                        <Separator orientation="vertical" className="h-4" />
                                        <Badge variant="outline" className={cn('px-2 py-0.5 text-[11px] font-semibold', item.priority === 1 ? 'border-destructive text-destructive' : '')}>
                                          P{item.priority}
                                        </Badge>
                                        {item.parts_ready && (
                                          <>
                                            <Separator orientation="vertical" className="h-4" />
                                            <span className="text-emerald-600 dark:text-emerald-400">Parts ready</span>
                                          </>
                                        )}
                                      </div>
                                      {item.notes && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.notes}</p>}
                                      {hasConflict && (
                                        <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                                          <AlertTriangle className="w-3 h-3" />
                                          <span>{conflicts.length} conflict{conflicts.length === 1 ? '' : 's'}</span>
                                        </div>
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent className="w-64 space-y-1">
                                    <p className="font-semibold">{getWorkOrderLabel(item.source_ref_id)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Duration: {(item.duration_minutes / 60).toFixed(1)}h • {formatTimeRange(item)}
                                    </p>
                                    {item.promised_at && (
                                      <p className="text-xs text-muted-foreground">
                                        Promised: {new Date(item.promised_at).toLocaleString()}
                                      </p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  : itemsForDay.map((item) => {
                      const conflicts = conflictDetailsMap.get(item.id) ?? [];
                      const hasConflict = conflicts.length > 0;
                      const conflictSummary = conflicts[0] ? formatConflict(conflicts[0]) : null;
                      return (
                        <Tooltip key={item.id}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className={cn(
                                'w-full rounded-lg border p-3 text-left transition hover:border-primary hover:bg-accent',
                                hasConflict ? 'border-destructive/50 bg-destructive/10 ring-1 ring-destructive/40' : ''
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <Badge className={cn('px-2 py-0.5 text-xs', statusStyles[item.status])}>{statusLabels[item.status]}</Badge>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatTimeRange(item)}</span>
                                  {hasConflict && conflictSummary && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AlertTriangle className="w-3 h-3 text-destructive" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="font-medium">{conflictSummary.title}</p>
                                        <p className="text-xs text-muted-foreground">{conflictSummary.details}</p>
                                        {conflicts.length > 1 && (
                                          <p className="text-xs text-muted-foreground">+{conflicts.length - 1} more overlap</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </div>
                              <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                                <ClipboardList className="w-4 h-4 text-primary" />
                                <span className="truncate">{getWorkOrderLabel(item.source_ref_id)}</span>
                              </div>
                              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  <span>{getTechnicianLabel(item.technician_id)}</span>
                                </div>
                                <Separator orientation="vertical" className="h-4" />
                                <Badge variant="outline" className={cn('px-2 py-0.5 text-[11px] font-semibold', item.priority === 1 ? 'border-destructive text-destructive' : '')}>
                                  P{item.priority}
                                </Badge>
                                {item.parts_ready && (
                                  <>
                                    <Separator orientation="vertical" className="h-4" />
                                    <span className="text-emerald-600 dark:text-emerald-400">Parts ready</span>
                                  </>
                                )}
                              </div>
                              {item.notes && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{item.notes}</p>}
                              {hasConflict && (
                                <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{conflicts.length} conflict{conflicts.length === 1 ? '' : 's'}</span>
                                </div>
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="w-64 space-y-1">
                            <p className="font-semibold">{getWorkOrderLabel(item.source_ref_id)}</p>
                            <p className="text-xs text-muted-foreground">
                              Duration: {(item.duration_minutes / 60).toFixed(1)}h • {formatTimeRange(item)}
                            </p>
                            {item.promised_at && (
                              <p className="text-xs text-muted-foreground">
                                Promised: {new Date(item.promised_at).toLocaleString()}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            Upcoming work
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {scheduleItems.length === 0 && <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>}
          {scheduleItems.map((item) => {
            const conflicts = conflictDetailsMap.get(item.id) ?? [];
            const hasConflict = conflicts.length > 0;
            const conflictSummary = conflicts[0] ? formatConflict(conflicts[0]) : null;
            return (
              <div
                key={item.id}
                className={cn(
                  'rounded-lg border p-3 shadow-sm transition hover:border-primary hover:bg-accent',
                  hasConflict ? 'border-destructive/50 bg-destructive/10 ring-1 ring-destructive/30' : ''
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className={cn('border', statusStyles[item.status])}>{statusLabels[item.status]}</Badge>
                    <span className="text-xs text-muted-foreground">{formatShortDate(new Date(item.start_at))}</span>
                    {hasConflict && conflictSummary && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="w-3 h-3 text-destructive" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{conflictSummary.title}</p>
                          <p className="text-xs text-muted-foreground">{conflictSummary.details}</p>
                          {conflicts.length > 1 && (
                            <p className="text-xs text-muted-foreground">+{conflicts.length - 1} more overlap</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <Badge variant="outline" className={cn('px-2 py-0.5 text-[11px] font-semibold', item.priority === 1 ? 'border-destructive text-destructive' : '')}>
                    P{item.priority}
                  </Badge>
                </div>
                <div className="mt-2 text-sm font-semibold">{getWorkOrderLabel(item.source_ref_id)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatTimeRange(item)} • {getTechnicianLabel(item.technician_id)}
                </div>
                {hasConflict && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                    <AlertTriangle className="w-3 h-3" />
                    {conflicts.length} conflict{conflicts.length === 1 ? '' : 's'}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Scheduled Item' : 'New Scheduled Item'}</DialogTitle>
            <DialogDescription>Assign a work order to the calendar and set timing and status.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {formError && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle>Cannot save</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            {dialogConflicts.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertTitle>Scheduling conflict</AlertTitle>
                <AlertDescription className="space-y-1">
                  <p>
                    {dialogConflicts.length} overlapping item{dialogConflicts.length === 1 ? '' : 's'} with this technician.
                  </p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    {dialogConflicts.map((conflict) => (
                      <li key={conflict.id}>
                        {getWorkOrderLabel(conflict.source_ref_id)} — {formatTimeRange(conflict)}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Work Order</Label>
                  {hasDialogConflicts && dialogConflictSummary && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{dialogConflictSummary.title}</p>
                        <p className="text-xs text-muted-foreground">{dialogConflictSummary.details}</p>
                        {dialogConflicts.length > 1 && (
                          <p className="text-xs text-muted-foreground">+{dialogConflicts.length - 1} more overlap</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <Select
                  value={formState.workOrderId || undefined}
                  onValueChange={(val) => setFormState((prev) => ({ ...prev, workOrderId: val }))}
                >
                  <SelectTrigger className={cn(hasDialogConflicts ? 'border-destructive/50 bg-destructive/10' : '')}>
                    <SelectValue placeholder="Select work order" />
                  </SelectTrigger>
                  <SelectContent>
                    {workOrders.map((wo) => (
                      <SelectItem key={wo.id} value={wo.id}>
                        {getWorkOrderLabel(wo.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Technician</Label>
                  {hasDialogConflicts && dialogConflictSummary && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{dialogConflictSummary.title}</p>
                        <p className="text-xs text-muted-foreground">{dialogConflictSummary.details}</p>
                        {dialogConflicts.length > 1 && (
                          <p className="text-xs text-muted-foreground">+{dialogConflicts.length - 1} more overlap</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <Select
                  value={formState.technicianId || undefined}
                  onValueChange={(val) =>
                    setFormState((prev) => ({
                      ...prev,
                      technicianId: val === '__NONE__' ? '' : val,
                    }))
                  }
                >
                  <SelectTrigger className={cn(hasDialogConflicts ? 'border-destructive/50 bg-destructive/10' : '')}>
                    <SelectValue placeholder="Assign technician (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__NONE__">
                      Unassigned
                    </SelectItem>
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Start</Label>
                  {hasDialogConflicts && dialogConflictSummary && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{dialogConflictSummary.title}</p>
                        <p className="text-xs text-muted-foreground">{dialogConflictSummary.details}</p>
                        {dialogConflicts.length > 1 && (
                          <p className="text-xs text-muted-foreground">+{dialogConflicts.length - 1} more overlap</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <Input
                  type="datetime-local"
                  value={formState.start}
                  onChange={(e) => setFormState((prev) => ({ ...prev, start: e.target.value }))}
                  className={cn(hasDialogConflicts ? 'border-destructive/50 bg-destructive/10' : '')}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Duration (hours)</Label>
                  {hasDialogConflicts && dialogConflictSummary && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{dialogConflictSummary.title}</p>
                        <p className="text-xs text-muted-foreground">{dialogConflictSummary.details}</p>
                        {dialogConflicts.length > 1 && (
                          <p className="text-xs text-muted-foreground">+{dialogConflicts.length - 1} more overlap</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <Input
                  type="number"
                  min={0.25}
                  step={0.25}
                  value={formState.durationHours}
                  onChange={(e) => setFormState((prev) => ({ ...prev, durationHours: Number(e.target.value) }))}
                  className={cn(hasDialogConflicts ? 'border-destructive/50 bg-destructive/10' : '')}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formState.status}
                  onValueChange={(val: ScheduleItemStatus) => setFormState((prev) => ({ ...prev, status: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(statusLabels) as ScheduleItemStatus[]).map((status) => (
                      <SelectItem key={status} value={status}>
                        {statusLabels[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Priority (1-5)</Label>
                  <Badge variant="outline" className={cn('px-2 py-0.5 text-[11px] font-semibold', formState.priority === 1 ? 'border-destructive text-destructive' : '')}>
                    P{formState.priority || 1}
                  </Badge>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={formState.priority}
                  onChange={(e) => setFormState((prev) => ({ ...prev, priority: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Promised Date</Label>
                <Input
                  type="datetime-local"
                  value={formState.promised}
                  onChange={(e) => setFormState((prev) => ({ ...prev, promised: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between space-y-0 rounded-lg border p-3">
                <div>
                  <Label className="text-sm font-medium">Parts Ready</Label>
                  <p className="text-xs text-muted-foreground">Flag when all parts are staged.</p>
                </div>
                <Switch
                  checked={formState.partsReady}
                  onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, partsReady: checked }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formState.notes}
                onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Extra scheduling details, bay needs, parts status…"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            {editingId && (
              <Button variant="destructive" onClick={handleDelete}>
                Remove
              </Button>
            )}
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveScheduleItem} disabled={hasDialogConflicts} title={hasDialogConflicts ? 'Resolve conflicts before saving' : undefined}>
                {editingId ? 'Save Changes' : 'Create Item'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
