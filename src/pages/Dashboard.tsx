import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useShopStore } from '@/stores/shopStore';
import { DashboardKpiCard } from '@/components/dashboard/DashboardKpiCard';
import { DashboardKanban } from '@/components/dashboard/DashboardKanban';
import type { DashboardKanbanColumn } from '@/components/dashboard/DashboardKanban';
import { DashboardAlertsRail } from '@/components/dashboard/DashboardAlertsRail';
import type { DashboardAlertGroup } from '@/components/dashboard/DashboardAlertsRail';
import { Wrench, ShoppingCart, AlertTriangle, DollarSign, Shield, ClipboardList, Clock3, MagnifyingGlass } from 'lucide-react';
import type { ScheduleItem, WorkOrder } from '@/types';

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    workOrders,
    salesOrders,
    purchaseOrders,
    parts,
    workOrderPartLines,
    workOrderLaborLines,
    settings,
    scheduleItems,
    technicians,
    timeEntries,
    customers,
    units,
  } = useShopStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsHydrating(false), 200);
    return () => clearTimeout(timer);
  }, []);

  const openWorkOrders = useMemo(
    () => workOrders.filter((wo) => wo.status !== 'INVOICED'),
    [workOrders]
  );

  const partsMap = useMemo(() => new Map(parts.map((part) => [part.id, part])), [parts]);
  const customersMap = useMemo(() => new Map(customers.map((customer) => [customer.id, customer])), [customers]);
  const unitsMap = useMemo(() => new Map(units.map((unit) => [unit.id, unit])), [units]);

  const scheduleMap = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    scheduleItems.forEach((item) => {
      if (!item.source_ref_id) return;
      const bucket = map.get(item.source_ref_id) ?? [];
      bucket.push(item);
      map.set(item.source_ref_id, bucket);
    });
    return map;
  }, [scheduleItems]);

  const hasPartsShortage = useCallback(
    (workOrder: WorkOrder) =>
      Boolean(
        workOrder.part_lines?.some((line) => {
          const part = partsMap.get(line.part_id);
          return part && part.quantity_on_hand < line.quantity;
        })
      ),
    [partsMap]
  );

  const waitingPartsWorkOrders = useMemo(
    () => openWorkOrders.filter((wo) => hasPartsShortage(wo)),
    [openWorkOrders, hasPartsShortage]
  );

  const waitingApprovalWorkOrders = useMemo(
    () => openWorkOrders.filter((wo) => wo.status === 'ESTIMATE'),
    [openWorkOrders]
  );

  const blockedCount = waitingPartsWorkOrders.length + waitingApprovalWorkOrders.length;

  const todayString = new Date().toDateString();
  const dailyRevenue = useMemo(() => {
    const invoices = [
      ...workOrders.filter((o) => o.invoiced_at && new Date(o.invoiced_at).toDateString() === todayString),
      ...salesOrders.filter((o) => o.invoiced_at && new Date(o.invoiced_at).toDateString() === todayString),
    ];
    return invoices.reduce((sum, order) => sum + (order.total ?? 0), 0);
  }, [workOrders, salesOrders, todayString]);

  const warrantyPartsCost = useMemo(() => {
    return workOrderPartLines.reduce((sum, line) => {
      if (!line.is_warranty) return sum;
      const part = partsMap.get(line.part_id);
      return sum + (part?.cost ?? 0) * line.quantity;
    }, 0);
  }, [workOrderPartLines, partsMap]);

  const warrantyLaborCost = useMemo(
    () => workOrderLaborLines.reduce((sum, line) => (line.is_warranty ? sum + line.line_total : sum), 0),
    [workOrderLaborLines]
  );

  const warrantyExposure = warrantyPartsCost + warrantyLaborCost;
  const warrantyFeatureEnabled = Boolean((settings as any)?.features?.warrantyDashboard);
  const showWarrantyCard = warrantyFeatureEnabled || warrantyExposure > 0;

  const negativeInventoryParts = useMemo(
    () => parts.filter((part) => part.quantity_on_hand < 0 && part.is_active),
    [parts]
  );

  const lastUpdated = useMemo(() => {
    const _ = openWorkOrders.length + salesOrders.length + purchaseOrders.length + parts.length;
    return new Date().toLocaleString();
  }, [openWorkOrders.length, salesOrders.length, purchaseOrders.length, parts.length]);

  const permissions = {
    workOrder: true,
    salesOrder: true,
    receiveInventory: true,
    cycleCount: true,
  };

  const quickActions = [
    { label: 'New Work Order', icon: Wrench, route: '/work-orders/new', permission: 'workOrder' },
    { label: 'New Sales Order', icon: ShoppingCart, route: '/sales-orders/new', permission: 'salesOrder' },
    { label: 'Receive Inventory', icon: ClipboardList, route: '/receive-inventory', permission: 'receiveInventory' },
    { label: 'Quick Cycle Count', icon: Clock3, route: '/cycle-counts/new', permission: 'cycleCount' },
  ];

  const kpiCards = useMemo(() => {
    const inProgressCount = openWorkOrders.filter((wo) => wo.status === 'IN_PROGRESS').length;
    const waitingCount = openWorkOrders.filter((wo) => wo.status === 'OPEN').length;
    const newCount = openWorkOrders.filter((wo) => wo.status === 'ESTIMATE').length;

    const cards = [
      {
        title: 'Open Work Orders',
        value: openWorkOrders.length,
        meta: [
          `In Progress ${inProgressCount}`,
          `Waiting ${waitingCount}`,
          `New ${newCount}`,
        ],
        description: 'Excludes invoiced orders',
        icon: Wrench,
        tone: 'primary' as const,
        onClick: () => navigate('/work-orders?status=open'),
      },
      {
        title: 'Blocked Work Orders',
        value: blockedCount,
        meta: [
          `Waiting Parts ${waitingPartsWorkOrders.length}`,
          `Waiting Approval ${waitingApprovalWorkOrders.length}`,
        ],
        icon: AlertTriangle,
        tone: blockedCount > 0 ? 'warning' as const : 'default' as const,
        onClick: () => navigate('/work-orders?filter=blocked'),
      },
      {
        title: 'Today Revenue',
        value: `$${dailyRevenue.toFixed(2)}`,
        description: 'Invoiced today',
        icon: DollarSign,
        tone: 'success' as const,
        onClick: () => navigate('/work-orders?filter=today'),
      },
      {
        title: 'Negative Inventory',
        value: negativeInventoryParts.length,
        description: 'Parts tracking below zero',
        icon: ClipboardList,
        tone: negativeInventoryParts.length > 0 ? 'warning' as const : 'default' as const,
        onClick: () => navigate('/inventory?filter=negative'),
      },
    ];

    if (showWarrantyCard) {
      cards.splice(3, 0, {
        title: 'Warranty Exposure',
        value: warrantyExposure > 0 ? `$${warrantyExposure.toFixed(2)}` : '—',
        description: 'Includes warranty labor + parts',
        icon: Shield,
        tone: warrantyExposure > 0 ? 'warning' as const : 'default' as const,
        onClick: () => navigate('/work-orders?filter=warranty'),
      });
    }

    return cards;
  }, [
    openWorkOrders,
    blockedCount,
    waitingPartsWorkOrders.length,
    waitingApprovalWorkOrders.length,
    dailyRevenue,
    negativeInventoryParts.length,
    warrantyExposure,
    showWarrantyCard,
    navigate,
  ]);

  const determineColumnId = useCallback(
    (
      workOrder: WorkOrder,
      ageDays: number,
      blockedByParts: boolean,
      hasScheduleItem: boolean,
      blockedBySchedule: boolean
    ) => {
      const isNew = workOrder.status === 'ESTIMATE' && ageDays <= 2;
      const isWaitingApproval = workOrder.status === 'ESTIMATE' && !isNew;
      const needsQa =
        (scheduleMap.get(workOrder.id) ?? []).some((item) => item.status === 'QA') ||
        Boolean(workOrder.notes?.toLowerCase().includes('qa'));
      const readyForInvoice = workOrder.status === 'IN_PROGRESS' && !blockedByParts && !blockedBySchedule;

      if (isNew) return 'new';
      if (isWaitingApproval) return 'waitingApproval';
      if (blockedByParts || blockedBySchedule) return 'waitingParts';
      if (hasScheduleItem) return 'scheduled';
      if (readyForInvoice) return 'readyToInvoice';
      if (needsQa) return 'qa';
      if (workOrder.status === 'IN_PROGRESS') return 'inProgress';
      return 'scheduled';
    },
    [scheduleMap]
  );

  const pipelineColumns = useMemo(() => {
    const schema: DashboardKanbanColumn[] = [
      { id: 'new', label: 'New', items: [] },
      { id: 'waitingApproval', label: 'Waiting Approval', items: [] },
      { id: 'waitingParts', label: 'Waiting Parts', items: [] },
      { id: 'scheduled', label: 'Scheduled', items: [] },
      { id: 'inProgress', label: 'In Progress', items: [] },
      { id: 'qa', label: 'QA', items: [] },
      { id: 'readyToInvoice', label: 'Ready to Invoice', items: [] },
    ];

    const map = new Map(schema.map((column) => [column.id, column]));

    openWorkOrders.forEach((workOrder) => {
      const createdAt = new Date(workOrder.created_at);
      const ageDays = Math.floor((Date.now() - createdAt.getTime()) / 1000 / 60 / 60 / 24);
      const schedule = scheduleMap.get(workOrder.id) ?? [];
      const hasScheduleItem = schedule.length > 0;
      const blockedBySchedule = schedule.some((item) => item.status === 'WAITING_PARTS' || item.status === 'WAITING_APPROVAL');
      const blockedByParts = hasPartsShortage(workOrder);
      const columnId = determineColumnId(workOrder, ageDays, blockedByParts, hasScheduleItem, blockedBySchedule);
      const column = map.get(columnId);
      if (!column) return;

      const customerName = customersMap.get(workOrder.customer_id)?.company_name ?? 'Unknown customer';
      const unitName = unitsMap.get(workOrder.unit_id)?.unit_name;
      const reasons = [] as string[];
      if (workOrder.status === 'ESTIMATE') reasons.push('Needs approval');
      if (blockedByParts) reasons.push('Awaiting parts');
      if (blockedBySchedule) reasons.push('Blocked by schedule');
      if (hasScheduleItem) reasons.push('Scheduled');

      column.items.push({
        id: workOrder.id,
        title: workOrder.order_number || workOrder.id,
        subtitle: `${customerName}${unitName ? ` · ${unitName}` : ''}`,
        meta: `${Math.max(ageDays, 0)}d ago · ${workOrder.status}`,
        badges: reasons.slice(0, 2),
        onClick: () => navigate(`/work-orders/${workOrder.id}`),
      });
    });

    return schema;
  }, [
    openWorkOrders,
    customersMap,
    unitsMap,
    scheduleMap,
    navigate,
    hasPartsShortage,
    determineColumnId,
  ]);

  const pipelineEmptyState = (
    <div className="rounded-lg border border-muted/50 bg-muted/50 p-5 text-sm text-muted-foreground">
      No open work orders. Create one to populate the pipeline.
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => navigate('/work-orders/new')}>Create Work Order</Button>
        <Button variant="outline" onClick={() => navigate('/sales-orders/new')}>
          Create Sales Order
        </Button>
      </div>
    </div>
  );

  const alertGroups: DashboardAlertGroup[] = [];

  alertGroups.push({
    title: 'Waiting on Parts',
    count: waitingPartsWorkOrders.length,
    description: 'Work orders blocked by shortages',
    items: waitingPartsWorkOrders.slice(0, 3).map((wo) => ({
      label: `${wo.order_number || wo.id}`,
      detail: customersMap.get(wo.customer_id)?.company_name ?? 'Customer unknown',
    })),
    viewLabel: 'View work orders',
    onView: () => navigate('/work-orders?filter=waiting-parts'),
  });

  alertGroups.push({
    title: 'Waiting on Approval',
    count: waitingApprovalWorkOrders.length,
    description: 'Estimates awaiting sign-off',
    items: waitingApprovalWorkOrders.slice(0, 3).map((wo) => ({
      label: `${wo.order_number || wo.id}`,
      detail: customersMap.get(wo.customer_id)?.company_name ?? 'Customer unknown',
    })),
    viewLabel: 'Review approvals',
    onView: () => navigate('/work-orders?filter=waiting-approval'),
  });

  alertGroups.push({
    title: 'Negative QOH Parts',
    count: negativeInventoryParts.length,
    description: 'Parts below zero stock',
    items: negativeInventoryParts.slice(0, 3).map((part) => ({
      label: part.part_number,
      detail: `${part.quantity_on_hand} on hand`,
    })),
    viewLabel: 'View inventory',
    onView: () => navigate('/inventory?filter=negative'),
  });

  const openPurchaseOrders = purchaseOrders.filter((po) => po.status === 'OPEN');
  if (openPurchaseOrders.length > 0) {
    alertGroups.push({
      title: 'Open Purchase Orders',
      count: openPurchaseOrders.length,
      description: 'Receiving and approvals pending',
      items: openPurchaseOrders.slice(0, 3).map((po) => ({
        label: po.po_number || po.id,
        detail: po.vendor?.vendor_name ?? 'Vendor unknown',
      })),
      viewLabel: 'View purchase orders',
      onView: () => navigate('/purchase-orders?status=open'),
    });
  }

  const techSnapshot = useMemo(() => {
    if (technicians.length === 0) return null;
    const clockedInCount = new Set(
      timeEntries.filter((entry) => !entry.clock_out).map((entry) => entry.technician_id)
    ).size;
    return {
      total: technicians.length,
      clockedIn: clockedInCount,
    };
  }, [technicians, timeEntries]);

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Command Center"
        subtitle={settings?.shop_name}
        description={<span className="text-xs text-muted-foreground">Last updated {lastUpdated}</span>}
        actions={
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(action.route)}
                  disabled={!permissions[action.permission as keyof typeof permissions]}
                  className="flex items-center gap-1"
                >
                  <action.icon className="w-4 h-4" />
                  {action.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Global search"
                className="min-w-[220px]"
                aria-label="Global search"
              />
              <Button size="sm" variant="outline" onClick={() => {}}>
                <MagnifyingGlass className="w-4 h-4" />
              </Button>
            </div>
          </div>
        }
      />

      {isHydrating ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {kpiCards.map((card) => (
            <DashboardKpiCard
              key={card.title}
              title={card.title}
              value={card.value}
              meta={card.meta}
              description={card.description}
              icon={card.icon}
              tone={card.tone}
              onClick={card.onClick}
            />
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          <Card>
            <CardHeader className="flex items-center justify-between space-x-2">
              <div>
                <CardTitle className="text-base font-semibold">Work Order Pipeline</CardTitle>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Open only</p>
              </div>
              <Badge variant="outline" className="text-xs">
                Kanban view
              </Badge>
            </CardHeader>
            <CardContent>
              <DashboardKanban columns={pipelineColumns} loading={isHydrating} emptyState={pipelineEmptyState} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <DashboardAlertsRail groups={alertGroups} loading={isHydrating} />
          {techSnapshot ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Technician Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Total technicians</p>
                  <p className="text-2xl font-semibold">{techSnapshot.total}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Clocked in now</p>
                  <p className="text-xl font-medium">{techSnapshot.clockedIn}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Technician Snapshot</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Technician/time data will show once time entries or staff profiles are available.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
