import { useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { useRepos } from '@/repos';
import { useToast } from '@/hooks/use-toast';
import { Save, X, Trash2, Edit, Wrench, ShoppingCart } from 'lucide-react';
import { PMSection } from '@/components/pm/PMSection';
import { useShopStore } from '@/stores/shopStore';

export default function UnitForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const repos = useRepos();
  const { units, addUnit, updateUnit, deactivateUnit } = repos.units;
  const { customers } = repos.customers;
  const { workOrders, createWorkOrder } = repos.workOrders;
  const { salesOrders, createSalesOrder } = repos.salesOrders;
  const schedulingRepo = repos.scheduling;
  const { toast } = useToast();
  const pmSchedules = useShopStore((s) => s.pmSchedules);
  const pmHistory = useShopStore((s) => s.pmHistory);

  const isNew = id === 'new';
  const unit = !isNew ? units.find((u) => u.id === id) : null;
  const preselectedCustomer = searchParams.get('customer');

  const [editing, setEditing] = useState(isNew);
  const [formData, setFormData] = useState({
    customer_id: unit?.customer_id || preselectedCustomer || '',
    unit_name: unit?.unit_name || '',
    vin: unit?.vin || '',
    year: unit?.year?.toString() || '',
    make: unit?.make || '',
    model: unit?.model || '',
    mileage: unit?.mileage?.toString() || '',
    hours: unit?.hours?.toString() || '',
    notes: unit?.notes || '',
  });

  const activeCustomers = customers.filter((c) => c.is_active && c.id !== 'walkin');

  const handleSave = () => {
    const trimmedName = formData.unit_name.trim();
    const trimmedVin = formData.vin.trim();

    if (!formData.customer_id) {
      toast({
        title: 'Validation Error',
        description: 'Customer is required',
        variant: 'destructive',
      });
      return;
    }

    if (!trimmedName) {
      toast({
        title: 'Validation Error',
        description: 'Unit name is required',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate VIN
    if (trimmedVin) {
      const vinExists = units.some(
        (u) => u.id !== id && u.vin?.toLowerCase() === trimmedVin.toLowerCase()
      );
      if (vinExists) {
        toast({
          title: 'Validation Error',
          description: 'A unit with this VIN already exists',
          variant: 'destructive',
        });
        return;
      }
    }

    // Check for duplicate unit name per customer
    const nameExists = units.some(
      (u) =>
        u.id !== id &&
        u.customer_id === formData.customer_id &&
        u.unit_name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (nameExists) {
      toast({
        title: 'Validation Error',
        description: 'This customer already has a unit with this name',
        variant: 'destructive',
      });
      return;
    }

    const unitData = {
      customer_id: formData.customer_id,
      unit_name: trimmedName,
      vin: trimmedVin || null,
      year: formData.year ? parseInt(formData.year) : null,
      make: formData.make.trim() || null,
      model: formData.model.trim() || null,
      mileage: formData.mileage ? parseInt(formData.mileage) : null,
      hours: formData.hours ? parseInt(formData.hours) : null,
      notes: formData.notes.trim() || null,
    };

    if (isNew) {
      const newUnit = addUnit(unitData);
      toast({
        title: 'Unit Created',
        description: `${formData.unit_name} has been added`,
      });
      navigate(`/units/${newUnit.id}`);
    } else {
      updateUnit(id!, unitData);
      toast({
        title: 'Unit Updated',
        description: 'Changes have been saved',
      });
      setEditing(false);
    }
  };

  const handleDeactivate = () => {
    deactivateUnit(id!);
    toast({
      title: 'Unit Deactivated',
      description: 'Unit has been deactivated',
    });
    navigate('/units');
  };

  const openWoStatuses = useMemo(
    () => new Set(['OPEN', 'IN_PROGRESS', 'SCHEDULED', 'ESTIMATE', 'HOLD']),
    []
  );
  const openSoStatuses = useMemo(
    () => new Set(['OPEN', 'APPROVED', 'ESTIMATE', 'QUOTE', 'PARTIAL']),
    []
  );

  const relatedWorkOrders = useMemo(() => {
    if (!unit) return [];
    const list = workOrders ?? [];
    return list
      .filter((wo) => wo.unit_id === unit.id)
      .sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || 0).getTime() -
          new Date(a.updated_at || a.created_at || 0).getTime()
      );
  }, [unit, workOrders]);

  const relatedSalesOrders = useMemo(() => {
    if (!unit) return [];
    const list = salesOrders ?? [];
    return list
      .filter((so) => so.unit_id === unit.id)
      .sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || 0).getTime() -
          new Date(a.updated_at || a.created_at || 0).getTime()
      );
  }, [unit, salesOrders]);

  const activitySummary = useMemo(() => {
    if (!unit) return null;
    const openWOs = relatedWorkOrders.filter((wo) => openWoStatuses.has(wo.status as string)).length;
    const openSOs = relatedSalesOrders.filter((so) => openSoStatuses.has(so.status as string)).length;
    const lastDates: string[] = [];
    relatedWorkOrders.forEach((wo) => {
      if (wo.updated_at || wo.created_at) lastDates.push((wo.updated_at || wo.created_at) as string);
    });
    relatedSalesOrders.forEach((so) => {
      if (so.updated_at || so.created_at) lastDates.push((so.updated_at || so.created_at) as string);
    });
    const lastActivity = lastDates.length
      ? lastDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : null;
    return { openWOs, openSOs, lastActivity };
  }, [relatedWorkOrders, relatedSalesOrders, unit, openWoStatuses, openSoStatuses]);

  const openRelatedWOs = useMemo(
    () => relatedWorkOrders.filter((wo) => openWoStatuses.has(wo.status as string)),
    [relatedWorkOrders, openWoStatuses]
  );
  const hotWorkOrder = useMemo(() => {
    if (openRelatedWOs.length === 0) return null;
    return [...openRelatedWOs].sort((a, b) => {
      const aPriority = typeof (a as { priority?: number }).priority === 'number' ? a.priority! : 0;
      const bPriority = typeof (b as { priority?: number }).priority === 'number' ? b.priority! : 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      const aDate = new Date(a.updated_at || a.created_at || 0).getTime();
      const bDate = new Date(b.updated_at || b.created_at || 0).getTime();
      return bDate - aDate;
    })[0];
  }, [openRelatedWOs]);

  const lastServiceDate = useMemo(() => {
    const closedStatuses = new Set(['COMPLETED', 'CLOSED', 'INVOICED']);
    const dates: string[] = [];
    relatedWorkOrders.forEach((wo) => {
      if (closedStatuses.has(wo.status as string) && (wo.updated_at || wo.created_at)) {
        dates.push((wo.updated_at || wo.created_at) as string);
      }
    });
    relatedSalesOrders.forEach((so) => {
      if (closedStatuses.has(so.status as string) && (so.updated_at || so.created_at)) {
        dates.push((so.updated_at || so.created_at) as string);
      }
    });
    if (dates.length === 0 && activitySummary?.lastActivity) return activitySummary.lastActivity;
    return dates.length
      ? dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : null;
  }, [activitySummary?.lastActivity, relatedSalesOrders, relatedWorkOrders]);

  const daysSinceLastService = useMemo(() => {
    if (!lastServiceDate) return null;
    const diff = Date.now() - new Date(lastServiceDate).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }, [lastServiceDate]);

  const overduePmCount = useMemo(() => {
    if (!unit) return null;
    const schedules = pmSchedules?.filter((s) => s.unit_id === unit.id && s.is_active !== false) || [];
    if (schedules.length === 0) return null;
    return schedules.reduce((count, schedule) => {
      const { interval_type, interval_value, last_completed_date, last_completed_meter } = schedule;
      if (interval_type === 'DAYS') {
        if (!last_completed_date) return count;
        const lastDate = new Date(last_completed_date);
        const nextDue = new Date(lastDate.getTime() + interval_value * 24 * 60 * 60 * 1000);
        if (Date.now() > nextDue.getTime()) return count + 1;
        return count;
      }
      const unitMeter =
        interval_type === 'MILES'
          ? unit.mileage != null
            ? Number(unit.mileage)
            : null
          : unit.hours != null
          ? Number(unit.hours)
          : null;
      if (unitMeter == null || last_completed_meter == null) return count;
      const nextDueMeter = last_completed_meter + interval_value;
      return unitMeter > nextDueMeter ? count + 1 : count;
    }, 0);
  }, [pmSchedules, unit]);

  const pmHistoryCount = useMemo(() => {
    if (!unit) return 0;
    return pmHistory?.filter((h) => h.unit_id === unit.id).length || 0;
  }, [pmHistory, unit]);

  const formattedYmm = useMemo(() => {
    if (!unit) return '';
    const parts = [unit.year, unit.make, unit.model].filter(Boolean);
    return parts.join(' • ');
  }, [unit]);

  const formattedMileage = useMemo(() => {
    if (!unit || unit.mileage == null) return '';
    return `${Number(unit.mileage).toLocaleString()} mi`;
  }, [unit]);

  const formattedHours = useMemo(() => {
    if (!unit || unit.hours == null) return '';
    return `${Number(unit.hours).toLocaleString()} hrs`;
  }, [unit]);

  const [openWorkOrdersOnly, setOpenWorkOrdersOnly] = useState(true);
  const [openSalesOrdersOnly, setOpenSalesOrdersOnly] = useState(true);

  const filteredWorkOrders = useMemo(
    () =>
      openWorkOrdersOnly
        ? relatedWorkOrders.filter((wo) => openWoStatuses.has(wo.status as string))
        : relatedWorkOrders,
    [openWorkOrdersOnly, relatedWorkOrders, openWoStatuses]
  );

  const filteredSalesOrders = useMemo(
    () =>
      openSalesOrdersOnly
        ? relatedSalesOrders.filter((so) => openSoStatuses.has(so.status as string))
        : relatedSalesOrders,
    [openSalesOrdersOnly, relatedSalesOrders, openSoStatuses]
  );

  const timelineEvents = useMemo(() => {
    const events: {
      id: string;
      type: 'WO' | 'SO' | 'PM';
      title: string;
      subtitle?: string;
      timestamp: string;
      onClick?: () => void;
    }[] = [];

    relatedWorkOrders.forEach((wo) => {
      const ts = (wo.updated_at || wo.created_at) as string | undefined;
      if (!ts) return;
      events.push({
        id: wo.id,
        type: 'WO',
        title: `Work Order ${wo.order_number || wo.id} ${wo.status}`,
        subtitle: unit?.unit_name,
        timestamp: ts,
        onClick: () => navigate(`/work-orders/${wo.id}`),
      });
    });

    relatedSalesOrders.forEach((so) => {
      const ts = (so.updated_at || so.created_at) as string | undefined;
      if (!ts) return;
      events.push({
        id: so.id,
        type: 'SO',
        title: `Sales Order ${so.order_number || so.id} ${so.status}`,
        subtitle: unit?.unit_name,
        timestamp: ts,
        onClick: () => navigate(`/sales-orders/${so.id}`),
      });
    });

    // PM history if available
    pmHistory
      ?.filter((h) => unit && h.unit_id === unit.id)
      .forEach((h) => {
        const ts = h.completed_at || h.created_at;
        if (!ts) return;
        events.push({
          id: h.id,
          type: 'PM',
          title: `PM Completed${h.schedule_name ? `: ${h.schedule_name}` : ''}`,
          subtitle: unit?.unit_name,
          timestamp: ts,
        });
      });

    return events
      .filter((e) => e.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);
  }, [navigate, pmHistory, relatedSalesOrders, relatedWorkOrders, unit]);

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={isNew ? 'New Unit' : unit?.unit_name || 'Unit'}
        subtitle={isNew ? 'Add a new unit' : unit?.is_active ? 'Active Unit' : 'Inactive Unit'}
        backTo="/units"
        description={
          !isNew && unit ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {unit.vin && (
                <span className="flex items-center gap-1 truncate max-w-xs">
                  <span className="font-medium">VIN</span>
                  <span className="font-mono truncate">{unit.vin}</span>
                </span>
              )}
              {formattedYmm && <span className="truncate">{formattedYmm}</span>}
              {formattedMileage && <span>{formattedMileage}</span>}
              {formattedHours && <span>{formattedHours}</span>}
            </div>
          ) : undefined
        }
        actions={
          editing ? (
            <>
              {!isNew && (
                <Button variant="outline" onClick={() => setEditing(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                {isNew ? 'Create Unit' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              {unit?.is_active && (
                <Button variant="destructive" onClick={handleDeactivate}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Deactivate
                </Button>
              )}
            </>
          )
        }
      />

      {!isNew && unit && activitySummary && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="py-3">
                <p className="text-sm text-muted-foreground">Open Work Orders</p>
                <p className="text-2xl font-semibold tracking-tight">{activitySummary.openWOs}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-sm text-muted-foreground">Open Sales Orders</p>
                <p className="text-2xl font-semibold tracking-tight">{activitySummary.openSOs}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-sm text-muted-foreground">Last Activity</p>
                <p className="text-lg font-semibold tracking-tight">
                  {activitySummary.lastActivity
                    ? new Date(activitySummary.lastActivity).toLocaleString()
                    : '—'}
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="py-3 space-y-1">
                <p className="text-sm text-muted-foreground">Hot Work Order</p>
                {hotWorkOrder ? (
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="link"
                      className="px-0 h-auto text-base font-semibold"
                      onClick={() => navigate(`/work-orders/${hotWorkOrder.id}`)}
                    >
                      {hotWorkOrder.order_number || hotWorkOrder.id}
                    </Button>
                    <StatusBadge status={hotWorkOrder.status} />
                  </div>
                ) : (
                  <p className="text-muted-foreground">No open work orders</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3 space-y-1">
                <p className="text-sm text-muted-foreground">Days Since Last Service</p>
                <p className="text-2xl font-semibold tracking-tight">
                  {daysSinceLastService != null ? daysSinceLastService : '—'}
                </p>
              </CardContent>
            </Card>
            {overduePmCount !== null && (
              <Card>
                <CardContent className="py-3 space-y-1">
                  <p className="text-sm text-muted-foreground">Overdue PM</p>
                  <p className="text-2xl font-semibold tracking-tight">{overduePmCount}</p>
                  <p className="text-xs text-muted-foreground">History records: {pmHistoryCount}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {!isNew && unit && (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              const created = createWorkOrder(unit.customer_id, unit.id);
              navigate(`/work-orders/${created.id}`);
            }}
          >
            <Wrench className="w-4 h-4 mr-2" />
            Create Work Order
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const created = createWorkOrder(unit.customer_id, unit.id);
              navigate(`/work-orders/${created.id}?openScheduling=1`);
            }}
          >
            <Wrench className="w-4 h-4 mr-2" />
            Create & Schedule Work Order
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const created = createSalesOrder(unit.customer_id, unit.id);
              navigate(`/sales-orders/${created.id}`);
            }}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Create Sales Order
          </Button>
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Unit Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customer_id">Customer *</Label>
              <Select
                value={formData.customer_id}
                onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                disabled={!editing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {activeCustomers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit_name">Unit Name *</Label>
              <Input
                id="unit_name"
                value={formData.unit_name}
                onChange={(e) => setFormData({ ...formData, unit_name: e.target.value })}
                disabled={!editing}
                placeholder="e.g., Truck #101"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vin">VIN</Label>
              <Input
                id="vin"
                value={formData.vin}
                onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
                disabled={!editing}
                placeholder="Vehicle Identification Number"
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  disabled={!editing}
                  placeholder="2024"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  disabled={!editing}
                  placeholder="e.g., Peterbilt"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  disabled={!editing}
                  placeholder="e.g., 389"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mileage">Mileage</Label>
              <Input
                id="mileage"
                type="number"
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                disabled={!editing}
                placeholder="Enter mileage"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Engine Hours</Label>
              <Input
                id="hours"
                type="number"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                disabled={!editing}
                placeholder="Enter hours"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={!editing}
              rows={3}
              placeholder="Additional notes about this unit"
            />
          </div>
        </CardContent>
      </Card>

      {/* PM Section - only show for existing units */}
      {!isNew && unit && (
        <>
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Planned Maintenance</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-4 pb-4 sm:px-6">
                <PMSection unit={unit} />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Unit Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {timelineEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent activity for this unit.</p>
                ) : (
                  timelineEvents.slice(0, 15).map((event) => {
                    const Content = (
                      <div className="flex items-start gap-3 w-full">
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary/70" />
                        <div className="flex-1">
                          <p className="font-medium leading-tight">{event.title}</p>
                          {event.subtitle && (
                            <p className="text-xs text-muted-foreground leading-tight">{event.subtitle}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                    );

                    if (event.onClick) {
                      return (
                        <button
                          key={`${event.type}-${event.id}-${event.timestamp}`}
                          onClick={() => event.onClick?.()}
                          className="w-full text-left p-2 rounded-md hover:bg-muted/60 transition"
                        >
                          {Content}
                        </button>
                      );
                    }

                    return (
                      <div
                        key={`${event.type}-${event.id}-${event.timestamp}`}
                        className="w-full text-left p-2 rounded-md bg-transparent"
                      >
                        {Content}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base font-semibold">Related Work Orders</CardTitle>
                <div className="w-full sm:w-48">
                  <Select
                    value={openWorkOrdersOnly ? 'open' : 'all'}
                    onValueChange={(val) => setOpenWorkOrdersOnly(val === 'open')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter work orders" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open only</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="h-10">
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWorkOrders.length === 0 ? (
                      <TableRow className="h-12">
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          {openWorkOrdersOnly ? 'No open work orders for this unit.' : 'No work orders for this unit.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredWorkOrders.map((wo) => (
                        <TableRow
                          key={wo.id}
                          className="cursor-pointer hover:bg-muted/50 h-12"
                          onClick={() => navigate(`/work-orders/${wo.id}`)}
                        >
                          <TableCell>
                            <StatusBadge status={wo.status} />
                          </TableCell>
                          <TableCell>
                            {wo.updated_at
                              ? new Date(wo.updated_at).toLocaleDateString()
                              : wo.created_at
                              ? new Date(wo.created_at).toLocaleDateString()
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {typeof wo.total === 'number' ? `$${wo.total.toFixed(2)}` : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/work-orders/${wo.id}`);
                                }}
                              >
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const scheduleResult = schedulingRepo?.ensureScheduleItemForWorkOrder
                                    ? schedulingRepo.ensureScheduleItemForWorkOrder(wo.id)
                                    : null;
                                  if (!scheduleResult?.item) {
                                    toast({
                                      title: 'Unable to schedule',
                                      description:
                                        scheduleResult?.reason ||
                                        'Could not create or find a schedule item for this work order.',
                                      variant: 'destructive',
                                    });
                                    return;
                                  }
                                  navigate(
                                    `/scheduling?focusScheduleItemId=${scheduleResult.item.id}&open=1`
                                  );
                                }}
                              >
                                Schedule
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base font-semibold">Related Sales Orders</CardTitle>
                <div className="w-full sm:w-48">
                  <Select
                    value={openSalesOrdersOnly ? 'open' : 'all'}
                    onValueChange={(val) => setOpenSalesOrdersOnly(val === 'open')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter sales orders" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open only</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="h-10">
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSalesOrders.length === 0 ? (
                      <TableRow className="h-12">
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          {openSalesOrdersOnly ? 'No open sales orders for this unit.' : 'No sales orders for this unit.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSalesOrders.map((so) => (
                        <TableRow
                          key={so.id}
                          className="cursor-pointer hover:bg-muted/50 h-12"
                          onClick={() => navigate(`/sales-orders/${so.id}`)}
                        >
                          <TableCell>
                            <StatusBadge status={so.status} />
                          </TableCell>
                          <TableCell>
                            {so.updated_at
                              ? new Date(so.updated_at).toLocaleDateString()
                              : so.created_at
                              ? new Date(so.created_at).toLocaleDateString()
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {typeof so.total === 'number' ? `$${so.total.toFixed(2)}` : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/sales-orders/${so.id}`);
                              }}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
