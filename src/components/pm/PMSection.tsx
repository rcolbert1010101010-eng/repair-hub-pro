import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Trash2, CheckCircle, AlertTriangle, Clock, XCircle } from 'lucide-react';
import { useShopStore } from '@/stores/shopStore';
import { PMScheduleDialog } from './PMScheduleDialog';
import { MarkPMCompletedDialog } from './MarkPMCompletedDialog';
import type { UnitPMSchedule, PMScheduleStatus, Unit } from '@/types';
import { differenceInDays, parseISO, format, addDays } from 'date-fns';

interface PMSectionProps {
  unit: Unit;
}

interface ComputedSchedule {
  schedule: UnitPMSchedule;
  nextDue: string | number | null;
  status: PMScheduleStatus;
  remaining: number | null; // days or meter units remaining
}

function computePMStatus(
  schedule: UnitPMSchedule,
  unitMileage: number | null,
  unitHours: number | null
): ComputedSchedule {
  const { interval_type, interval_value, last_completed_date, last_completed_meter } = schedule;

  let nextDue: string | number | null = null;
  let status: PMScheduleStatus = 'NOT_CONFIGURED';
  let remaining: number | null = null;

  if (interval_type === 'DAYS') {
    if (last_completed_date) {
      const lastDate = parseISO(last_completed_date);
      const nextDueDate = addDays(lastDate, interval_value);
      nextDue = format(nextDueDate, 'yyyy-MM-dd');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      remaining = differenceInDays(nextDueDate, today);

      if (remaining < 0) {
        status = 'OVERDUE';
      } else if (remaining <= 14) {
        status = 'DUE_SOON';
      } else {
        status = 'OK';
      }
    } else {
      status = 'NOT_CONFIGURED';
    }
  } else {
    // MILES or HOURS
    const currentMeter = interval_type === 'MILES' ? unitMileage : unitHours;

    if (last_completed_meter !== null) {
      const nextDueMeter = last_completed_meter + interval_value;
      nextDue = nextDueMeter;

      if (currentMeter === null) {
        status = 'NOT_CONFIGURED';
        remaining = null;
      } else {
        remaining = nextDueMeter - currentMeter;

        if (remaining < 0) {
          status = 'OVERDUE';
        } else if (remaining <= 500) {
          status = 'DUE_SOON';
        } else {
          status = 'OK';
        }
      }
    } else {
      status = 'NOT_CONFIGURED';
    }
  }

  return { schedule, nextDue, status, remaining };
}

function getStatusBadge(status: PMScheduleStatus) {
  switch (status) {
    case 'OVERDUE':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          Overdue
        </Badge>
      );
    case 'DUE_SOON':
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 gap-1">
          <Clock className="w-3 h-3" />
          Due Soon
        </Badge>
      );
    case 'OK':
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle className="w-3 h-3" />
          OK
        </Badge>
      );
    case 'NOT_CONFIGURED':
      return (
        <Badge variant="outline" className="gap-1">
          <XCircle className="w-3 h-3" />
          Not Configured
        </Badge>
      );
  }
}

function formatNextDue(computed: ComputedSchedule): string {
  const { schedule, nextDue, status } = computed;
  
  if (status === 'NOT_CONFIGURED' || nextDue === null) {
    return 'No baseline set';
  }

  if (schedule.interval_type === 'DAYS') {
    return format(parseISO(nextDue as string), 'MMM d, yyyy');
  }

  const suffix = schedule.interval_type === 'MILES' ? ' mi' : ' hrs';
  return (nextDue as number).toLocaleString() + suffix;
}

function formatInterval(schedule: UnitPMSchedule): string {
  const value = schedule.interval_value.toLocaleString();
  switch (schedule.interval_type) {
    case 'MILES':
      return `${value} miles`;
    case 'HOURS':
      return `${value} hours`;
    case 'DAYS':
      return `${value} days`;
  }
}

function formatLastCompleted(schedule: UnitPMSchedule): string {
  if (!schedule.last_completed_date && schedule.last_completed_meter === null) {
    return '-';
  }

  const parts: string[] = [];
  
  if (schedule.last_completed_date) {
    parts.push(format(parseISO(schedule.last_completed_date), 'MMM d, yyyy'));
  }
  
  if (schedule.last_completed_meter !== null) {
    const suffix = schedule.interval_type === 'MILES' ? ' mi' : ' hrs';
    parts.push(`@ ${schedule.last_completed_meter.toLocaleString()}${suffix}`);
  }

  return parts.join(' ');
}

export function PMSection({ unit }: PMSectionProps) {
  const navigate = useNavigate();
  const { getPMSchedulesByUnit, getPMHistoryByUnit, deactivatePMSchedule, pmSchedules, createWorkOrder, updateWorkOrderNotes, woAddLaborLine, updatePMSchedule } = useShopStore();
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<UnitPMSchedule | null>(null);
  const [completingSchedule, setCompletingSchedule] = useState<UnitPMSchedule | null>(null);

  // Get schedules for this unit
  const schedules = getPMSchedulesByUnit(unit.id);
  const history = getPMHistoryByUnit(unit.id);

  // Compute status for each schedule
  const computedSchedules = useMemo(() => {
    return schedules.map((s) => computePMStatus(s, unit.mileage, unit.hours));
  }, [schedules, unit.mileage, unit.hours]);

  // Summary counts
  const summary = useMemo(() => {
    const counts = { overdue: 0, dueSoon: 0, ok: 0, notConfigured: 0 };
    computedSchedules.forEach((c) => {
      switch (c.status) {
        case 'OVERDUE':
          counts.overdue++;
          break;
        case 'DUE_SOON':
          counts.dueSoon++;
          break;
        case 'OK':
          counts.ok++;
          break;
        case 'NOT_CONFIGURED':
          counts.notConfigured++;
          break;
      }
    });
    return counts;
  }, [computedSchedules]);

  // Find next upcoming due (most urgent)
  const nextUpcoming = useMemo(() => {
    const valid = computedSchedules.filter((c) => c.status !== 'NOT_CONFIGURED');
    if (valid.length === 0) return null;

    // Sort by urgency: overdue first (by most overdue), then due soon, then ok
    valid.sort((a, b) => {
      // Priority: OVERDUE > DUE_SOON > OK
      const statusPriority = { OVERDUE: 0, DUE_SOON: 1, OK: 2, NOT_CONFIGURED: 3 };
      if (statusPriority[a.status] !== statusPriority[b.status]) {
        return statusPriority[a.status] - statusPriority[b.status];
      }
      // Within same status, sort by remaining (smallest first)
      if (a.remaining !== null && b.remaining !== null) {
        return a.remaining - b.remaining;
      }
      return 0;
    });

    return valid[0];
  }, [computedSchedules]);

  const handleEdit = (schedule: UnitPMSchedule) => {
    setEditingSchedule(schedule);
    setScheduleDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingSchedule(null);
    setScheduleDialogOpen(true);
  };

  const handleDeactivate = (schedule: UnitPMSchedule) => {
    deactivatePMSchedule(schedule.id);
  };

  const handleMarkComplete = (schedule: UnitPMSchedule) => {
    setCompletingSchedule(schedule);
  };

  const handleCreateWorkOrder = (computed: ComputedSchedule) => {
    if (computed.status !== 'OVERDUE' && computed.status !== 'DUE_SOON') return;

    const dueKey = `${computed.schedule.interval_type}:${computed.nextDue ?? 'NONE'}`;
    if (dueKey.endsWith(':NONE')) {
      return;
    }

    if (computed.schedule.last_generated_due_key === dueKey && computed.schedule.last_generated_work_order_id) {
      navigate(`/work-orders/${computed.schedule.last_generated_work_order_id}`);
      return;
    }

    const wo = createWorkOrder(unit.customer_id, unit.id);

    const dueText = formatNextDue(computed);

    const notes = `PM: ${computed.schedule.name} — Status: ${computed.status} — Due: ${dueText}`;

    updateWorkOrderNotes(wo.id, notes);

    const laborDesc = computed.schedule.default_labor_description ?? `Preventive Maintenance - ${computed.schedule.name}`;
    const laborHours = computed.schedule.default_labor_hours ?? 1;
    woAddLaborLine(wo.id, laborDesc, laborHours);

    updatePMSchedule(computed.schedule.id, {
      last_generated_due_key: dueKey,
      last_generated_work_order_id: wo.id,
    });

    navigate(`/work-orders/${wo.id}`);
  };

  const currentMeter = unit.mileage || unit.hours;

  // Get schedule name for history
  const getScheduleName = (scheduleId: string) => {
    const schedule = schedules.find((s) => s.id === scheduleId);
    return schedule?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Preventive Maintenance</h2>
          <Button onClick={handleAddNew} size="sm" variant="outline" className="h-9 px-3">
            <Plus className="w-4 h-4 mr-2" />
            Add PM Schedule
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Keep schedules on track and generate work when due.
        </p>
      </div>

      {/* PM Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">PM Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border p-3 bg-destructive/5 border-destructive/30">
              <p className="text-xs uppercase text-muted-foreground tracking-wide">Overdue</p>
              <p className="text-3xl font-semibold text-destructive leading-tight">{summary.overdue}</p>
            </div>
            <div className="rounded-lg border p-3 bg-amber-50">
              <p className="text-xs uppercase text-muted-foreground tracking-wide">Due Soon</p>
              <p className="text-3xl font-semibold text-amber-600 leading-tight">{summary.dueSoon}</p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/40">
              <p className="text-xs uppercase text-muted-foreground tracking-wide">Total Schedules</p>
              <p className="text-3xl font-semibold leading-tight">{computedSchedules.length}</p>
            </div>
            <div className="rounded-lg border p-3 bg-secondary">
              <p className="text-xs uppercase text-muted-foreground tracking-wide">On Track</p>
              <p className="text-3xl font-semibold leading-tight">{summary.ok}</p>
            </div>
          </div>

          {nextUpcoming && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 p-3">
              <div className="text-sm text-muted-foreground">Next Upcoming</div>
              <span className="font-medium">{nextUpcoming.schedule.name}</span>
              {getStatusBadge(nextUpcoming.status)}
              <span className="text-sm text-muted-foreground">Due: {formatNextDue(nextUpcoming)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PM Schedules Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">PM Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          {computedSchedules.length === 0 ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm text-muted-foreground">
              <span>No PM schedules configured.</span>
              <Button size="sm" onClick={handleAddNew}>
                <Plus className="w-4 h-4 mr-2" />
                Add PM Schedule
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Last Completed</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {computedSchedules.map((computed) => (
                  <TableRow key={computed.schedule.id}>
                    <TableCell className="font-medium">{computed.schedule.name}</TableCell>
                    <TableCell>{formatInterval(computed.schedule)}</TableCell>
                    <TableCell>{formatLastCompleted(computed.schedule)}</TableCell>
                    <TableCell>{formatNextDue(computed)}</TableCell>
                    <TableCell>{getStatusBadge(computed.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCreateWorkOrder(computed)}
                          title="Create Work Order"
                          disabled={computed.status !== 'OVERDUE' && computed.status !== 'DUE_SOON'}
                        >
                          WO
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkComplete(computed.schedule)}
                          title="Mark Completed"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(computed.schedule)}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivate(computed.schedule)}
                          title="Deactivate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* PM History */}
      {history.length === 0 ? (
        <div className="text-sm text-muted-foreground px-1">
          No PM history yet. Mark a schedule complete to add history.
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">PM History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>PM Name</TableHead>
                  <TableHead>Meter</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...history]
                  .sort((a, b) => new Date(b.completed_date).getTime() - new Date(a.completed_date).getTime())
                  .map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>{format(parseISO(h.completed_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{getScheduleName(h.schedule_id)}</TableCell>
                      <TableCell>
                        {h.completed_meter !== null ? h.completed_meter.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{h.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <PMScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        unitId={unit.id}
        schedule={editingSchedule}
      />

      <MarkPMCompletedDialog
        open={!!completingSchedule}
        onOpenChange={(open) => !open && setCompletingSchedule(null)}
        schedule={completingSchedule}
        currentMeter={currentMeter}
      />
    </div>
  );
}
