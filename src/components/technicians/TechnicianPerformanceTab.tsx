import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useShopStore } from '@/stores/shopStore';
import { 
  calculatePerformanceMetrics, 
  calculateTrendData,
  calculateJobEfficiency,
  type TrendPeriod 
} from '@/services/technicianPerformance';
import type { Technician } from '@/types';
import { 
  Gauge, 
  Clock, 
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TechnicianPerformanceTabProps {
  technician: Technician;
}

export function TechnicianPerformanceTab({ technician }: TechnicianPerformanceTabProps) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<TrendPeriod>(30);
  
  const workOrders = useShopStore((s) => s.workOrders);
  const laborLines = useShopStore((s) => s.workOrderLaborLines);
  const woTimeEntries = useShopStore((s) => s.workOrderTimeEntries);
  const timeEntries = useShopStore((s) => s.timeEntries);

  const metrics = useMemo(
    () => calculatePerformanceMetrics(
      technician,
      laborLines,
      woTimeEntries,
      timeEntries,
      workOrders,
      period
    ),
    [technician, laborLines, woTimeEntries, timeEntries, workOrders, period]
  );

  const trendData = useMemo(
    () => calculateTrendData(
      technician,
      laborLines,
      woTimeEntries,
      workOrders,
      period
    ),
    [technician, laborLines, woTimeEntries, workOrders, period]
  );

  const jobEfficiency = useMemo(
    () => calculateJobEfficiency(
      technician.id,
      laborLines,
      woTimeEntries,
      workOrders,
      period
    ),
    [technician.id, laborLines, woTimeEntries, workOrders, period]
  );

  const getEfficiencyVariant = (percent: number) => {
    if (percent >= 100) return 'success';
    if (percent >= 80) return 'default';
    return 'warning';
  };

  const getUtilizationVariant = (percent: number) => {
    if (percent >= 80) return 'success';
    if (percent >= 60) return 'default';
    return 'warning';
  };

  const formatOverEstimate = (hours: number) => {
    if (Math.abs(hours) < 0.1) return 'On target';
    if (hours > 0) return `Over estimate by ${hours}h`;
    return `Under estimate by ${Math.abs(hours)}h`;
  };

  const getEfficiencyBadgeVariant = (percent: number) => {
    if (percent >= 100) return 'secondary';
    if (percent >= 80) return 'default';
    return 'destructive';
  };

  const formatVariance = (hours: number) => {
    if (Math.abs(hours) < 0.1) return '—';
    if (hours > 0) return `+${hours}h`;
    return `${hours}h`;
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Period Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">Period:</span>
        <Tabs value={period.toString()} onValueChange={(v) => setPeriod(Number(v) as TrendPeriod)}>
          <TabsList>
            <TabsTrigger value="7">7 days</TabsTrigger>
            <TabsTrigger value="30">30 days</TabsTrigger>
            <TabsTrigger value="90">90 days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Avg Efficiency"
          value={`${metrics.avgEfficiencyPercent}%`}
          icon={Gauge}
          variant={getEfficiencyVariant(metrics.avgEfficiencyPercent)}
        />
        <StatCard
          title="Utilization"
          value={`${metrics.utilizationPercent}%`}
          icon={Clock}
          variant={getUtilizationVariant(metrics.utilizationPercent)}
        />
        <StatCard
          title="Avg Hours/Day"
          value={`${metrics.avgHoursPerDay}h`}
          icon={CalendarDays}
          variant="default"
        />
      </div>

      {/* Contextual Message */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            {metrics.overEstimateHours > 0 ? (
              <TrendingDown className="w-5 h-5 text-warning mt-0.5 shrink-0" />
            ) : metrics.overEstimateHours < 0 ? (
              <TrendingUp className="w-5 h-5 text-success mt-0.5 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium">
                {formatOverEstimate(metrics.overEstimateHours)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.jobCount} job{metrics.jobCount !== 1 ? 's' : ''} completed • 
                {' '}{metrics.totalEstimatedHours}h estimated • 
                {' '}{metrics.totalActualHours}h actual
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hours Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Hours Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Scheduled</p>
              <p className="text-lg font-medium">{metrics.totalScheduledHours}h</p>
            </div>
            <div>
              <p className="text-muted-foreground">Clocked</p>
              <p className="text-lg font-medium">{metrics.totalWorkedHours}h</p>
            </div>
            <div>
              <p className="text-muted-foreground">Estimated</p>
              <p className="text-lg font-medium">{metrics.totalEstimatedHours}h</p>
            </div>
            <div>
              <p className="text-muted-foreground">Actual (on jobs)</p>
              <p className="text-lg font-medium">{metrics.totalActualHours}h</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Efficiency Trend Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Efficiency Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {trendData.length > 0 && trendData.some(d => d.actualHours > 0) ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString();
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'efficiencyPercent') return [`${value}%`, 'Efficiency'];
                      return [value, name];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="efficiencyPercent"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <p className="text-sm">No job data available for this period</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job-Level Breakdown Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Job-Level Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {jobEfficiency.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work Order</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Est.</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">Efficiency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobEfficiency.slice(0, 10).map((job) => (
                    <TableRow 
                      key={job.jobLineId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/work-orders/${job.workOrderId}`)}
                    >
                      <TableCell className="font-medium text-primary">
                        {job.workOrderNumber}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {job.description || '—'}
                      </TableCell>
                      <TableCell className="text-right">{job.estimatedHours}h</TableCell>
                      <TableCell className="text-right">{job.actualHours}h</TableCell>
                      <TableCell className={`text-right ${job.variance > 0 ? 'text-warning' : job.variance < 0 ? 'text-success' : ''}`}>
                        {formatVariance(job.variance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getEfficiencyBadgeVariant(job.efficiencyPercent)}>
                          {job.efficiencyPercent}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {jobEfficiency.length > 10 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Showing 10 of {jobEfficiency.length} jobs
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              No job data available for this period
            </p>
          )}
        </CardContent>
      </Card>

      {/* Info Note */}
      <p className="text-xs text-muted-foreground">
        Efficiency = Estimated hours ÷ Actual hours. Higher percentages indicate jobs completed 
        faster than estimated. Utilization = Clocked hours ÷ Scheduled hours.
      </p>
    </div>
  );
}
