import { differenceInDays, parseISO, startOfDay, subDays, isWithinInterval } from 'date-fns';
import type { 
  Technician, 
  WorkOrder, 
  WorkOrderLaborLine, 
  WorkOrderTimeEntry,
  TimeEntry,
  TechnicianWorkSchedule
} from '@/types';

export interface PerformanceMetrics {
  avgEfficiencyPercent: number;
  utilizationPercent: number;
  avgHoursPerDay: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  totalScheduledHours: number;
  totalWorkedHours: number;
  jobCount: number;
  overEstimateHours: number; // Positive = over estimate, negative = under
}

export interface TrendDataPoint {
  date: string;
  efficiencyPercent: number;
  actualHours: number;
  estimatedHours: number;
}

export type TrendPeriod = 7 | 30 | 90;

const DEFAULT_SCHEDULE: TechnicianWorkSchedule = {
  days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
  start_time: '07:00',
  end_time: '15:30',
};

/**
 * Calculate the scheduled work hours for a technician based on their work schedule
 */
function getScheduledHoursPerDay(schedule?: TechnicianWorkSchedule): number {
  const s = schedule || DEFAULT_SCHEDULE;
  const [startH, startM] = s.start_time.split(':').map(Number);
  const [endH, endM] = s.end_time.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return (endMinutes - startMinutes) / 60;
}

/**
 * Count scheduled work days within a date range for a technician
 */
function countScheduledDays(
  schedule: TechnicianWorkSchedule | undefined,
  startDate: Date,
  endDate: Date
): number {
  const s = schedule || DEFAULT_SCHEDULE;
  let count = 0;
  const dayMap: Record<number, keyof TechnicianWorkSchedule['days']> = {
    0: 'sun',
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
    6: 'sat',
  };

  const current = new Date(startDate);
  while (current <= endDate) {
    const dayKey = dayMap[current.getDay()];
    if (s.days[dayKey]) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Get all labor lines assigned to a technician
 */
function getTechnicianLaborLines(
  technicianId: string,
  laborLines: WorkOrderLaborLine[],
  workOrders: WorkOrder[],
  startDate?: Date,
  endDate?: Date
): WorkOrderLaborLine[] {
  return laborLines.filter((line) => {
    if (line.technician_id !== technicianId) return false;
    
    if (startDate && endDate) {
      const wo = workOrders.find((w) => w.id === line.work_order_id);
      if (!wo) return false;
      const woDate = parseISO(wo.created_at);
      return isWithinInterval(woDate, { start: startDate, end: endDate });
    }
    return true;
  });
}

/**
 * Get all work order time entries for a technician
 */
function getTechnicianTimeEntries(
  technicianId: string,
  woTimeEntries: WorkOrderTimeEntry[],
  startDate?: Date,
  endDate?: Date
): WorkOrderTimeEntry[] {
  return woTimeEntries.filter((entry) => {
    if (entry.technician_id !== technicianId) return false;
    
    if (startDate && endDate && entry.started_at) {
      const entryDate = parseISO(entry.started_at);
      return isWithinInterval(entryDate, { start: startDate, end: endDate });
    }
    return true;
  });
}

/**
 * Get general time entries (clock in/out) for a technician
 */
function getTechnicianClockEntries(
  technicianId: string,
  timeEntries: TimeEntry[],
  startDate?: Date,
  endDate?: Date
): TimeEntry[] {
  return timeEntries.filter((entry) => {
    if (entry.technician_id !== technicianId) return false;
    
    if (startDate && endDate && entry.clock_in) {
      const entryDate = parseISO(entry.clock_in);
      return isWithinInterval(entryDate, { start: startDate, end: endDate });
    }
    return true;
  });
}

/**
 * Calculate performance metrics for a technician
 */
export function calculatePerformanceMetrics(
  technician: Technician,
  laborLines: WorkOrderLaborLine[],
  woTimeEntries: WorkOrderTimeEntry[],
  timeEntries: TimeEntry[],
  workOrders: WorkOrder[],
  periodDays?: TrendPeriod
): PerformanceMetrics {
  const endDate = startOfDay(new Date());
  const startDate = periodDays ? subDays(endDate, periodDays) : undefined;

  // Get technician's labor lines (estimated hours)
  const techLaborLines = getTechnicianLaborLines(
    technician.id,
    laborLines,
    workOrders,
    startDate,
    endDate
  );

  // Get technician's work order time entries (actual job time)
  const techWoTimeEntries = getTechnicianTimeEntries(
    technician.id,
    woTimeEntries,
    startDate,
    endDate
  );

  // Get technician's clock entries (general clock in/out)
  const techClockEntries = getTechnicianClockEntries(
    technician.id,
    timeEntries,
    startDate,
    endDate
  );

  // Calculate totals
  const totalEstimatedHours = techLaborLines.reduce((sum, line) => sum + line.hours, 0);
  const totalActualSeconds = techWoTimeEntries.reduce((sum, entry) => sum + entry.seconds, 0);
  const totalActualHours = totalActualSeconds / 3600;

  // Calculate total worked hours from clock entries
  const totalWorkedMinutes = techClockEntries.reduce((sum, entry) => sum + entry.total_minutes, 0);
  const totalWorkedHours = totalWorkedMinutes / 60;

  // Calculate scheduled hours for the period
  const hoursPerDay = getScheduledHoursPerDay(technician.work_schedule);
  const scheduledDays = startDate
    ? countScheduledDays(technician.work_schedule, startDate, endDate)
    : countScheduledDays(technician.work_schedule, subDays(endDate, 30), endDate);
  const totalScheduledHours = scheduledDays * hoursPerDay;

  // Calculate efficiency: (estimated / actual) * 100
  // Higher = completing work faster than estimated
  const avgEfficiencyPercent = totalActualHours > 0
    ? Math.round((totalEstimatedHours / totalActualHours) * 100)
    : totalEstimatedHours > 0 ? 100 : 0;

  // Calculate utilization: (worked hours / scheduled hours) * 100
  const utilizationPercent = totalScheduledHours > 0
    ? Math.round((totalWorkedHours / totalScheduledHours) * 100)
    : 0;

  // Calculate average hours worked per day
  const daysInPeriod = periodDays || 30;
  const avgHoursPerDay = daysInPeriod > 0 ? totalWorkedHours / Math.min(scheduledDays || 1, daysInPeriod) : 0;

  // Calculate over/under estimate (positive = took longer than estimated)
  const overEstimateHours = totalActualHours - totalEstimatedHours;

  return {
    avgEfficiencyPercent,
    utilizationPercent,
    avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
    totalEstimatedHours: Math.round(totalEstimatedHours * 10) / 10,
    totalActualHours: Math.round(totalActualHours * 10) / 10,
    totalScheduledHours: Math.round(totalScheduledHours * 10) / 10,
    totalWorkedHours: Math.round(totalWorkedHours * 10) / 10,
    jobCount: techLaborLines.length,
    overEstimateHours: Math.round(overEstimateHours * 10) / 10,
  };
}

/**
 * Generate trend data points for a technician over a period
 */
export function calculateTrendData(
  technician: Technician,
  laborLines: WorkOrderLaborLine[],
  woTimeEntries: WorkOrderTimeEntry[],
  workOrders: WorkOrder[],
  periodDays: TrendPeriod
): TrendDataPoint[] {
  const endDate = startOfDay(new Date());
  const dataPoints: TrendDataPoint[] = [];

  // Group by day for shorter periods, by week for 90 days
  const groupSize = periodDays === 90 ? 7 : 1;
  const numGroups = Math.ceil(periodDays / groupSize);

  for (let i = numGroups - 1; i >= 0; i--) {
    const groupEnd = subDays(endDate, i * groupSize);
    const groupStart = subDays(groupEnd, groupSize - 1);

    const techLaborLines = getTechnicianLaborLines(
      technician.id,
      laborLines,
      workOrders,
      groupStart,
      groupEnd
    );

    const techWoTimeEntries = getTechnicianTimeEntries(
      technician.id,
      woTimeEntries,
      groupStart,
      groupEnd
    );

    const estimatedHours = techLaborLines.reduce((sum, line) => sum + line.hours, 0);
    const actualSeconds = techWoTimeEntries.reduce((sum, entry) => sum + entry.seconds, 0);
    const actualHours = actualSeconds / 3600;

    const efficiencyPercent = actualHours > 0
      ? Math.round((estimatedHours / actualHours) * 100)
      : estimatedHours > 0 ? 100 : 0;

    dataPoints.push({
      date: groupEnd.toISOString().split('T')[0],
      efficiencyPercent,
      actualHours: Math.round(actualHours * 10) / 10,
      estimatedHours: Math.round(estimatedHours * 10) / 10,
    });
  }

  return dataPoints;
}
