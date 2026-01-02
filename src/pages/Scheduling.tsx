import { useMemo, useState } from 'react';
import { CalendarDays, Clock, User, AlertTriangle, Plus, ChevronLeft, ChevronRight, ClipboardList, Wrench } from 'lucide-react';
import { useRepos } from '@/repos';
import type { ScheduleItem, ScheduleItemStatus, ScheduleBlockType } from '@/types';
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
import { Link } from 'react-router-dom';

const DAILY_CAPACITY_MINUTES = 480;

type FormState = {
  itemType: 'WORK_ORDER' | 'BLOCK';
  blockType: ScheduleBlockType;
  blockTitle: string;
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
    itemType: 'WORK_ORDER',
    blockType: 'BREAK',
    blockTitle: '',
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
  const [technicianFilter, setTechnicianFilter] = useState<'ALL' | 'UNASSIGNED' | string>('ALL');
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

  const getBlockLabel = (item: ScheduleItem) => {
    const base =
      item.block_type === 'BREAK'
        ? 'Break'
        : item.block_type === 'PTO'
          ? 'PTO'
          : item.block_type === 'MEETING'
            ? 'Meeting'
            : item.block_type === 'FABRICATION'
              ? 'Fabrication'
              : 'Block';
    const title = item.block_title?.trim();
    return title ? `${base}: ${title}` : base;
  };

  const getItemLabel = (item: ScheduleItem) =>
    item.source_ref_type === 'BLOCK' ? getBlockLabel(item) : getWorkOrderLabel(item.source_ref_id);

  const formatConflict = (conflict: ScheduleItem) => {
    const techName = getTechnicianLabel(conflict.technician_id);
    const woLabel = getItemLabel(conflict);
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
  const weekDayRange = useMemo(() => {
    const base = getWeekStart(startDate);
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(base);
      d.setDate(base.getDate() + idx);
      return d;
    });
  }, [startDate]);

  const techWeekLoads = useMemo(() => {
    const map = new Map<string, number[]>();
    const base = getWeekStart(startDate);
    const baseMidnight = new Date(base);
    baseMidnight.setHours(0, 0, 0, 0);
    scheduleItems.forEach((item) => {
      const start = new Date(item.start_at);
      const startMidnight = new Date(start);
      startMidnight.setHours(0, 0, 0, 0);
      const diffDays = Math.round((startMidnight.getTime() - baseMidnight.getTime()) / 86400000);
      if (diffDays < 0 || diffDays > 6) return;
      const key = item.technician_id ?? 'unassigned';
      const arr = map.get(key) ?? Array(7).fill(0);
      arr[diffDays] += item.duration_minutes;
      map.set(key, arr);
    });
    return map;
  }, [scheduleItems, startDate]);

  const getLoadTierClass = (percent: number) => {
    if (percent === 0) return 'bg-muted';
    if (percent < 50) return 'bg-accent/40';
    if (percent < 100) return 'bg-accent';
    return 'bg-destructive';
  };

  const prefillStartForDate = (techId?: string | null) => {
    const start = new Date(startDate);
    start.setHours(8, 0, 0, 0);
    return {
      start: toLocalInput(start),
      technicianId: techId ?? '',
    };
  };

  const handleOpenNew = (techId?: string | null) => {
    setEditingId(null);
    const prefilled = prefillStartForDate(techId);
    setFormState((prev) => ({
      ...defaultFormState(),
      start: prefilled.start,
      technicianId: prefilled.technicianId,
    }));
    setFormError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: ScheduleItem) => {
    setEditingId(item.id);
    setFormState({
      itemType: item.source_ref_type,
      blockType: item.block_type ?? 'BREAK',
      blockTitle: item.block_title ?? '',
      workOrderId: item.source_ref_type === 'BLOCK' ? '' : item.source_ref_id,
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
    const isBlock = formState.itemType === 'BLOCK';
    if (!isBlock && !formState.workOrderId) {
      setFormError('Work order is required.');
      return;
    }
    if (!formState.start) {
      setFormError('Start time is required.');
      return;
    }

    const priority = Math.min(5, Math.max(1, Math.round(formState.priority))) as ScheduleItem['priority'];
    const blockRef = formState.blockTitle.trim() || `BLOCK-${new Date(isoStart || Date.now()).toISOString()}`;

    const payload: Omit<ScheduleItem, 'id' | 'created_at' | 'updated_at'> & { id?: string } = {
      id: editingId ?? undefined,
      source_ref_type: isBlock ? 'BLOCK' : 'WORK_ORDER',
      source_ref_id: isBlock ? blockRef : formState.workOrderId,
      block_type: isBlock ? formState.blockType : null,
      block_title: isBlock ? (formState.blockTitle.trim() || null) : null,
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

  const itemsForDate = useMemo(
    () =>
      scheduleItems
        .filter((item) => sameDay(item.start_at, startDate))
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
    [scheduleItems, startDate]
  );

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Scheduling"
        subtitle="Plan technician workload for the week."
        actions={
          <div className="flex items-center gap-2">
            <Select value={technicianFilter} onValueChange={(val) => setTechnicianFilter(val as typeof technicianFilter)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All technicians" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All technicians</SelectItem>
                <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                {technicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button
              onClick={() => {
                if (technicianFilter === 'ALL') handleOpenNew(undefined);
                else if (technicianFilter === 'UNASSIGNED') handleOpenNew(null);
                else handleOpenNew(technicianFilter);
              }}
            >
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

      {viewMode === 'DAY' ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(['unassigned', ...technicians.map((t) => t.id)] as string[])
            .filter((id) => {
              if (technicianFilter === 'ALL') return true;
              if (technicianFilter === 'UNASSIGNED') return id === 'unassigned';
              return id === technicianFilter;
            })
            .map((techId) => {
              const tech = technicianMap.get(techId) ?? null;
              const laneItems = itemsForDate.filter((item) =>
                techId === 'unassigned' ? !item.technician_id : item.technician_id === techId
              );
              const loadMinutes = laneItems.reduce((sum, item) => sum + item.duration_minutes, 0);
              const overCap = loadMinutes > DAILY_CAPACITY_MINUTES;
              const loadHours = (loadMinutes / 60).toFixed(1);

              return (
                <Card key={techId} className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <CardTitle className="text-base">
                          {techId === 'unassigned' ? 'Unassigned' : tech?.name || 'Technician'}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className={cn('px-2 py-0.5', overCap ? 'border-destructive text-destructive' : '')}>
                          Load: {loadHours}h
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenNew(techId === 'unassigned' ? null : techId)}
                          title="Add schedule item"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
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
                    {viewMode === 'WEEK' && (
                      <div className="mt-2 flex items-center gap-1">
                        {(techWeekLoads.get(techId) ?? Array(7).fill(0)).map((minutes, idx) => {
                          const percent = Math.min(200, Math.round((minutes / DAILY_CAPACITY_MINUTES) * 100));
                          const day = weekDayRange[idx];
                          return (
                            <Tooltip key={`${techId}-${day.toISOString()}`}>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    'h-3 w-6 rounded',
                                    getLoadTierClass(percent)
                                  )}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs font-semibold">
                                  {day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {minutes} min / {DAILY_CAPACITY_MINUTES} min ({percent}%)
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {laneItems.length === 0 && (
                      <p className="text-sm text-muted-foreground">No scheduled work.</p>
                    )}
                    {laneItems.map((item) => {
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
                                {item.source_ref_type === 'WORK_ORDER' ? (
                                  <Link
                                    to={`/work-orders/${item.source_ref_id}`}
                                    className="truncate text-primary hover:underline"
                                  >
                                    {getItemLabel(item)}
                                  </Link>
                                ) : (
                                  <span className="truncate">{getItemLabel(item)}</span>
                                )}
                                {item.auto_scheduled && (
                                  <Badge variant="outline" className="ml-1 text-[10px]">
                                    Auto-scheduled
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                                <Badge variant="outline" className={cn('px-2 py-0.5 text-[11px] font-semibold', item.priority === 1 ? 'border-destructive text-destructive' : '')}>
                                  P{item.priority}
                                </Badge>
                                <Separator orientation="vertical" className="h-4" />
                                <span>{formatTimeRange(item)}</span>
                                {item.parts_ready && (
                                  <>
                                    <Separator orientation="vertical" className="h-4" />
                                    <span className="text-emerald-600 dark:text-emerald-400">Parts ready</span>
                                  </>
                                )}
                                {item.promised_at && (
                                  <>
                                    <Separator orientation="vertical" className="h-4" />
                                    <span>Promised: {new Date(item.promised_at).toLocaleDateString()}</span>
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
                                    <p className="font-semibold">{getItemLabel(item)}</p>
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
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {weekDays.map((day, idx) => {
            const itemsForDay = weekItems[idx] ?? [];
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
                <CardContent className="space-y-2">
                  {itemsForDay.length === 0 && (
                    <p className="text-sm text-muted-foreground">No scheduled work.</p>
                  )}
                  {itemsForDay.map((item) => {
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
                              <span className="truncate">{getItemLabel(item)}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                              <Badge variant="outline" className={cn('px-2 py-0.5 text-[11px] font-semibold', item.priority === 1 ? 'border-destructive text-destructive' : '')}>
                                P{item.priority}
                              </Badge>
                              <Separator orientation="vertical" className="h-4" />
                              <span>{getTechnicianLabel(item.technician_id)}</span>
                              <Separator orientation="vertical" className="h-4" />
                              <span>{formatTimeRange(item)}</span>
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
                            <p className="font-semibold">{getItemLabel(item)}</p>
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
      )}

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
                <div className="mt-2 text-sm font-semibold">{getItemLabel(item)}</div>
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
                        {getItemLabel(conflict)} — {formatTimeRange(conflict)}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formState.itemType}
                  onValueChange={(val: 'WORK_ORDER' | 'BLOCK') =>
                    setFormState((prev) => ({ ...prev, itemType: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WORK_ORDER">Work Order</SelectItem>
                    <SelectItem value="BLOCK">Block</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formState.itemType === 'WORK_ORDER' ? (
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
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Block Type</Label>
                    <Select
                      value={formState.blockType}
                      onValueChange={(val: ScheduleBlockType) =>
                        setFormState((prev) => ({ ...prev, blockType: val }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BREAK">Break</SelectItem>
                        <SelectItem value="PTO">PTO</SelectItem>
                        <SelectItem value="MEETING">Meeting</SelectItem>
                        <SelectItem value="FABRICATION">Fabrication</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Block Title</Label>
                    <Input
                      value={formState.blockTitle}
                      onChange={(e) => setFormState((prev) => ({ ...prev, blockTitle: e.target.value }))}
                      placeholder="Optional description (e.g., Team meeting)"
                    />
                  </div>
                </>
              )}
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
