import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useShopStore } from '@/stores/shopStore';
import { useToast } from '@/hooks/use-toast';
import { Save, Plus, Trash2, FileCheck, Printer, Play, Edit, X, Clock, Square, Shield, RotateCcw, Check, Pencil, X as XIcon } from 'lucide-react';
import { QuickAddDialog } from '@/components/ui/quick-add-dialog';
import { PrintWorkOrder } from '@/components/print/PrintInvoice';
import { calcPartPriceForLevel } from '@/domain/pricing/partPricing';

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    workOrders,
    customers,
    units,
    parts,
    settings,
    technicians,
    getWorkOrderPartLines,
    getWorkOrderLaborLines,
    getTimeEntriesByWorkOrder,
    getActiveTimeEntry,
    createWorkOrder,
    woAddPartLine,
    woUpdatePartQty,
    woUpdateLineUnitPrice,
    woRemovePartLine,
    woTogglePartWarranty,
    woToggleCoreReturned,
    woMarkCoreReturned,
    woAddLaborLine,
    woRemoveLaborLine,
    woToggleLaborWarranty,
    woUpdateStatus,
    woInvoice,
    updateWorkOrderNotes,
    clockIn,
    clockOut,
    addCustomer,
    addUnit,
  } = useShopStore();
  const { toast } = useToast();

  const isNew = id === 'new';
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [order, setOrder] = useState(() => {
    if (!isNew) return workOrders.find((o) => o.id === id);
    return null;
  });

  const [addPartDialogOpen, setAddPartDialogOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [editingPriceLineId, setEditingPriceLineId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState<string>('');

  const [addLaborDialogOpen, setAddLaborDialogOpen] = useState(false);
  const [laborDescription, setLaborDescription] = useState('');
  const [laborHours, setLaborHours] = useState('1');
  const [laborTechnicianId, setLaborTechnicianId] = useState('');

  const [quickAddCustomerOpen, setQuickAddCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [quickAddUnitOpen, setQuickAddUnitOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showCoreReturnDialog, setShowCoreReturnDialog] = useState(false);
  const [coreReturnLineId, setCoreReturnLineId] = useState<string | null>(null);
  const currentOrder = order || workOrders.find((o) => o.id === id);
  const activeCustomers = customers.filter((c) => c.is_active && c.id !== 'walkin');
  const customerUnits = useMemo(() => {
    const custId = selectedCustomerId || currentOrder?.customer_id;
    if (!custId) return [];
    return units.filter((u) => u.customer_id === custId && u.is_active);
  }, [selectedCustomerId, currentOrder?.customer_id, units]);
  const activeParts = parts.filter((p) => p.is_active);
  const activeTechnicians = technicians.filter((t) => t.is_active);

  const isInvoiced = currentOrder?.status === 'INVOICED';

  // Time tracking data
  const timeEntries = currentOrder ? getTimeEntriesByWorkOrder(currentOrder.id) : [];
  const totalMinutes = timeEntries.reduce((sum, te) => sum + te.total_minutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(2);

  if (!isNew && !currentOrder) {
    return (
      <div className="page-container">
        <PageHeader title="Order Not Found" backTo="/work-orders" />
        <p className="text-muted-foreground">This work order does not exist.</p>
      </div>
    );
  }

  const handleCreateOrder = () => {
    if (!selectedCustomerId) {
      toast({ title: 'Error', description: 'Please select a customer', variant: 'destructive' });
      return;
    }
    if (!selectedUnitId) {
      toast({ title: 'Error', description: 'Please select a unit', variant: 'destructive' });
      return;
    }
    const newOrder = createWorkOrder(selectedCustomerId, selectedUnitId);
    navigate(`/work-orders/${newOrder.id}`, { replace: true });
    setOrder(newOrder);
    toast({ title: 'Order Created', description: `Work Order ${newOrder.order_number} created` });
  };

  const handleAddPart = () => {
    if (!selectedPartId || !currentOrder) return;
    const qty = parseInt(partQty) || 1;
    const result = woAddPartLine(currentOrder.id, selectedPartId, qty);
    if (result.success) {
      toast({ title: 'Part Added' });
      setAddPartDialogOpen(false);
      setSelectedPartId('');
      setPartQty('1');
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleUpdateQty = (lineId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemovePartLine(lineId);
      return;
    }
    const result = woUpdatePartQty(lineId, newQty);
    if (!result.success) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleRemovePartLine = (lineId: string) => {
    const result = woRemovePartLine(lineId);
    if (!result.success) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleAddLabor = () => {
    if (!laborDescription.trim() || !currentOrder) return;
    const hours = parseFloat(laborHours) || 1;
    const result = woAddLaborLine(currentOrder.id, laborDescription.trim(), hours, laborTechnicianId || undefined);
    if (result.success) {
      toast({ title: 'Labor Added' });
      setAddLaborDialogOpen(false);
      setLaborDescription('');
      setLaborHours('1');
      setLaborTechnicianId('');
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleRemoveLaborLine = (lineId: string) => {
    const result = woRemoveLaborLine(lineId);
    if (!result.success) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleClockIn = (technicianId: string) => {
    if (!currentOrder) return;
    const result = clockIn(technicianId, currentOrder.id);
    if (result.success) {
      const tech = technicians.find((t) => t.id === technicianId);
      toast({ title: 'Clocked In', description: `${tech?.name} is now working on this order` });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleClockOut = (technicianId: string) => {
    const result = clockOut(technicianId);
    if (result.success) {
      toast({ title: 'Clocked Out' });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleStartWork = () => {
    if (!currentOrder) return;
    const result = woUpdateStatus(currentOrder.id, 'IN_PROGRESS');
    if (result.success) {
      toast({ title: 'Work Started', description: 'Work order is now in progress' });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleInvoice = () => {
    if (!currentOrder) return;
    const result = woInvoice(currentOrder.id);
    if (result.success) {
      toast({ title: 'Order Invoiced', description: 'Work order has been invoiced and locked' });
      setShowInvoiceDialog(false);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleQuickAddCustomer = () => {
    if (!newCustomerName.trim()) return;
    const newCustomer = addCustomer({
      company_name: newCustomerName.trim(),
      contact_name: null,
      phone: null,
      email: null,
      address: null,
      notes: null,
    });
    setSelectedCustomerId(newCustomer.id);
    setQuickAddCustomerOpen(false);
    setNewCustomerName('');
    toast({ title: 'Customer Added' });
  };

  const handleQuickAddUnit = () => {
    if (!newUnitName.trim() || !selectedCustomerId) return;
    const newUnit = addUnit({
      customer_id: selectedCustomerId,
      unit_name: newUnitName.trim(),
      vin: null,
      year: null,
      make: null,
      model: null,
      mileage: null,
      hours: null,
      notes: null,
    });
    setSelectedUnitId(newUnit.id);
    setQuickAddUnitOpen(false);
    setNewUnitName('');
    toast({ title: 'Unit Added' });
  };

  const handleEditNotes = () => {
    setNotesValue(currentOrder?.notes || '');
    setIsEditingNotes(true);
  };

  const handleSaveNotes = () => {
    if (!currentOrder) return;
    updateWorkOrderNotes(currentOrder.id, notesValue.trim() || null);
    setIsEditingNotes(false);
    toast({ title: 'Notes Updated' });
  };

  const handleMarkCoreReturned = (lineId: string) => {
    setCoreReturnLineId(lineId);
    setShowCoreReturnDialog(true);
  };

  const confirmMarkCoreReturned = () => {
    if (!coreReturnLineId) return;
    const result = woMarkCoreReturned(coreReturnLineId);
    if (result.success) {
      toast({ title: 'Core Returned', description: 'Refund line has been created' });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setShowCoreReturnDialog(false);
    setCoreReturnLineId(null);
  };

  const customer = customers.find((c) => c.id === (currentOrder?.customer_id || selectedCustomerId));
  const unit = units.find((u) => u.id === (currentOrder?.unit_id || selectedUnitId));
  const allPartLines = currentOrder ? getWorkOrderPartLines(currentOrder.id) : [];
  const laborLines = currentOrder ? getWorkOrderLaborLines(currentOrder.id) : [];
  const priceLevel = customer?.price_level ?? 'RETAIL';
  const priceLevelLabel =
    customer?.price_level === 'WHOLESALE'
      ? 'Wholesale'
      : customer?.price_level === 'FLEET'
      ? 'Fleet'
      : 'Retail';
  
  // Separate part lines and refund lines for display
  const partLines = allPartLines.filter((l) => !l.is_core_refund_line);
  const refundLines = allPartLines.filter((l) => l.is_core_refund_line);

  // New order form
  if (isNew && !order) {
    return (
      <div className="page-container">
        <PageHeader title="New Work Order" backTo="/work-orders" />
        <div className="form-section max-w-xl">
          <h2 className="text-lg font-semibold mb-4">Order Details</h2>
          <div className="space-y-4">
            <div>
              <Label>Customer *</Label>
              <div className="flex gap-2">
                <Select value={selectedCustomerId} onValueChange={(v) => {
                  setSelectedCustomerId(v);
                  setSelectedUnitId('');
                }}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCustomers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setQuickAddCustomerOpen(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {selectedCustomerId && (
              <div>
                <Label>Unit *</Label>
                <div className="flex gap-2">
                  <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerUnits.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.unit_name} {u.vin && `(${u.vin})`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => setQuickAddUnitOpen(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <Button onClick={handleCreateOrder} className="w-full" disabled={!selectedCustomerId || !selectedUnitId}>
              <Save className="w-4 h-4 mr-2" />
              Create Order
            </Button>
          </div>
        </div>

        <QuickAddDialog open={quickAddCustomerOpen} onOpenChange={setQuickAddCustomerOpen} title="Quick Add Customer" onSave={handleQuickAddCustomer} onCancel={() => setQuickAddCustomerOpen(false)}>
          <div>
            <Label>Company Name *</Label>
            <Input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Enter company name" />
          </div>
        </QuickAddDialog>

        <QuickAddDialog open={quickAddUnitOpen} onOpenChange={setQuickAddUnitOpen} title="Quick Add Unit" onSave={handleQuickAddUnit} onCancel={() => setQuickAddUnitOpen(false)}>
          <div>
            <Label>Unit Name *</Label>
            <Input value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} placeholder="Enter unit name" />
          </div>
        </QuickAddDialog>
      </div>
    );
  }

  // Existing order view
  return (
    <div className="page-container">
      <PageHeader
        title={currentOrder?.order_number || 'Work Order'}
        subtitle={currentOrder?.status === 'INVOICED' ? 'Invoiced' : currentOrder?.status === 'IN_PROGRESS' ? 'In Progress' : 'Open'}
        backTo="/work-orders"
        actions={
          !isInvoiced ? (
            <>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              {currentOrder?.status === 'OPEN' && (
                <Button variant="secondary" onClick={handleStartWork}>
                  <Play className="w-4 h-4 mr-2" />
                  Start Work
                </Button>
              )}
              <Button onClick={() => setShowInvoiceDialog(true)}>
                <FileCheck className="w-4 h-4 mr-2" />
                Invoice
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        {/* Order Info */}
        <div className="form-section">
          <h2 className="text-lg font-semibold mb-4">Order Information</h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Customer:</span>
              <p className="font-medium">{customer?.company_name || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Price Level:</span>
              <p className="font-medium">{customer ? priceLevelLabel : 'Retail'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Unit:</span>
              <p className="font-medium">{unit?.unit_name || '-'}</p>
              {unit?.vin && <p className="text-xs text-muted-foreground font-mono">{unit.vin}</p>}
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>
              <p className="font-medium">{new Date(currentOrder?.created_at || '').toLocaleString()}</p>
            </div>
            {currentOrder?.invoiced_at && (
              <div>
                <span className="text-muted-foreground">Invoiced:</span>
                <p className="font-medium">{new Date(currentOrder.invoiced_at).toLocaleString()}</p>
              </div>
            )}
          </div>
          
          {/* Notes Section */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">Notes:</span>
              {!isInvoiced && !isEditingNotes && (
                <Button variant="ghost" size="sm" onClick={handleEditNotes}>
                  <Edit className="w-3 h-3" />
                </Button>
              )}
            </div>
            {isEditingNotes ? (
              <div className="space-y-2">
                <Textarea value={notesValue} onChange={(e) => setNotesValue(e.target.value)} rows={3} placeholder="Add notes..." />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveNotes}><Save className="w-3 h-3 mr-1" />Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditingNotes(false)}><X className="w-3 h-3 mr-1" />Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm">{currentOrder?.notes || '-'}</p>
            )}
          </div>

          {/* Time Tracking Section */}
          {!isInvoiced && activeTechnicians.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Time Tracking
              </h3>
              <div className="space-y-2">
                {activeTechnicians.map((tech) => {
                  const activeEntry = getActiveTimeEntry(tech.id);
                  const isOnThisOrder = activeEntry?.work_order_id === currentOrder?.id;
                  
                  return (
                    <div key={tech.id} className="flex items-center justify-between text-sm">
                      <span>{tech.name}</span>
                      {isOnThisOrder ? (
                        <Button size="sm" variant="destructive" onClick={() => handleClockOut(tech.id)}>
                          <Square className="w-3 h-3 mr-1" />
                          Clock Out
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleClockIn(tech.id)} disabled={!!activeEntry}>
                          <Clock className="w-3 h-3 mr-1" />
                          {activeEntry ? 'Busy' : 'Clock In'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Total tracked: {totalHours} hrs</p>
            </div>
          )}
        </div>

        {/* Parts & Labor */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="parts" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="parts">Parts ({partLines.length})</TabsTrigger>
              <TabsTrigger value="labor">Labor ({laborLines.length})</TabsTrigger>
              {timeEntries.length > 0 && <TabsTrigger value="time">Time ({timeEntries.length})</TabsTrigger>}
            </TabsList>

            <TabsContent value="parts">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Parts</h3>
                {!isInvoiced && (
                  <Button size="sm" onClick={() => setAddPartDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Part
                  </Button>
                )}
              </div>
              <div className="table-container">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Warranty</TableHead>
                      <TableHead className="text-center">Core</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      {!isInvoiced && <TableHead className="w-10"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partLines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No parts added yet</TableCell>
                      </TableRow>
                    ) : (
                      partLines.map((line) => {
                        const part = parts.find((p) => p.id === line.part_id);
                        return (
                          <TableRow key={line.id} className={line.is_warranty ? 'bg-accent/30' : ''}>
                            <TableCell className="font-mono">{part?.part_number || '-'}</TableCell>
                            <TableCell>{part?.description || '-'}</TableCell>
                            <TableCell className="text-center">
                              {!isInvoiced ? (
                                <Checkbox checked={line.is_warranty} onCheckedChange={() => woTogglePartWarranty(line.id)} />
                              ) : line.is_warranty ? (
                                <Badge variant="secondary"><Shield className="w-3 h-3" /></Badge>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-center">
                              {line.core_charge > 0 && (
                                <div className="flex items-center justify-center gap-1">
                                  {line.core_status === 'CORE_OWED' ? (
                                    <Button size="sm" variant="outline" onClick={() => handleMarkCoreReturned(line.id)} className="h-6 text-xs">
                                      Core Owed (${line.core_charge})
                                    </Button>
                                  ) : line.core_status === 'CORE_CREDITED' ? (
                                    <Badge variant="secondary"><RotateCcw className="w-3 h-3 mr-1" />Credited</Badge>
                                  ) : null}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isInvoiced ? line.quantity : (
                                <Input type="number" min="1" value={line.quantity} onChange={(e) => handleUpdateQty(line.id, parseInt(e.target.value) || 0)} className="w-16 text-right" />
                              )}
                            </TableCell>
                        <TableCell className="text-right">
                          {isInvoiced ? (
                            `$${line.unit_price.toFixed(2)}`
                          ) : editingPriceLineId === line.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={priceDraft}
                                onChange={(e) => setPriceDraft(e.target.value)}
                                className="w-24 h-8 text-right"
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  const parsed = parseFloat(priceDraft);
                                  const result = woUpdateLineUnitPrice(line.id, parsed);
                                  if (!result.success) {
                                    toast({ title: 'Error', description: result.error, variant: 'destructive' });
                                    return;
                                  }
                                  setEditingPriceLineId(null);
                                  setPriceDraft('');
                                }}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingPriceLineId(null);
                                  setPriceDraft('');
                                }}
                              >
                                <XIcon className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const suggested = part ? calcPartPriceForLevel(part, settings, priceLevel) : null;
                                  if (suggested != null) {
                                    setPriceDraft(suggested.toFixed(2));
                                  }
                                }}
                              >
                                Reset
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <span>${line.unit_price.toFixed(2)}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingPriceLineId(line.id);
                                  setPriceDraft(line.unit_price.toFixed(2));
                                }}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                            <TableCell className="text-right font-medium">
                              {line.is_warranty ? <span className="text-muted-foreground">$0.00</span> : `$${line.line_total.toFixed(2)}`}
                            </TableCell>
                            {!isInvoiced && (
                              <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => handleRemovePartLine(line.id)} className="text-destructive hover:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="labor">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Labor (Rate: ${settings.default_labor_rate}/hr)</h3>
                {!isInvoiced && (
                  <Button size="sm" onClick={() => setAddLaborDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Labor
                  </Button>
                )}
              </div>
              <div className="table-container">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Technician</TableHead>
                      <TableHead className="text-center">Warranty</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      {!isInvoiced && <TableHead className="w-10"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {laborLines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No labor added yet</TableCell>
                      </TableRow>
                    ) : (
                      laborLines.map((line) => {
                        const tech = technicians.find((t) => t.id === line.technician_id);
                        return (
                          <TableRow key={line.id} className={line.is_warranty ? 'bg-accent/30' : ''}>
                            <TableCell>{line.description}</TableCell>
                            <TableCell>{tech?.name || '-'}</TableCell>
                            <TableCell className="text-center">
                              {!isInvoiced ? (
                                <Checkbox checked={line.is_warranty} onCheckedChange={() => woToggleLaborWarranty(line.id)} />
                              ) : line.is_warranty ? (
                                <Badge variant="secondary"><Shield className="w-3 h-3" /></Badge>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-right">{line.hours}</TableCell>
                            <TableCell className="text-right">${line.rate.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {line.is_warranty ? <span className="text-muted-foreground">$0.00</span> : `$${line.line_total.toFixed(2)}`}
                            </TableCell>
                            {!isInvoiced && (
                              <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveLaborLine(line.id)} className="text-destructive hover:text-destructive">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {timeEntries.length > 0 && (
              <TabsContent value="time">
                <h3 className="font-medium mb-4">Time Entries</h3>
                <div className="table-container">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Technician</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead className="text-right">Minutes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeEntries.map((entry) => {
                        const tech = technicians.find((t) => t.id === entry.technician_id);
                        return (
                          <TableRow key={entry.id}>
                            <TableCell>{tech?.name || '-'}</TableCell>
                            <TableCell>{new Date(entry.clock_in).toLocaleString()}</TableCell>
                            <TableCell>{entry.clock_out ? new Date(entry.clock_out).toLocaleString() : <Badge>Active</Badge>}</TableCell>
                            <TableCell className="text-right">{entry.total_minutes}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            )}
          </Tabs>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parts Subtotal:</span>
                <span>${currentOrder?.parts_subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Labor Subtotal:</span>
                <span>${currentOrder?.labor_subtotal.toFixed(2)}</span>
              </div>
              {(currentOrder?.core_charges_total ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Core Charges:</span>
                  <span>${currentOrder?.core_charges_total.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>${currentOrder?.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({currentOrder?.tax_rate}%):</span>
                <span>${currentOrder?.tax_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t border-border pt-2">
                <span>Total:</span>
                <span>${currentOrder?.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Invoice */}
      {currentOrder && (
        <PrintWorkOrder order={currentOrder} partLines={partLines} laborLines={laborLines} customer={customer} unit={unit} parts={parts} shopName={settings.shop_name} />
      )}

      {/* Add Part Dialog */}
      <QuickAddDialog open={addPartDialogOpen} onOpenChange={setAddPartDialogOpen} title="Add Part" onSave={handleAddPart} onCancel={() => setAddPartDialogOpen(false)}>
        <div className="space-y-4">
          <div>
            <Label>Part *</Label>
            <Select value={selectedPartId} onValueChange={setSelectedPartId}>
              <SelectTrigger><SelectValue placeholder="Select part" /></SelectTrigger>
              <SelectContent>
                {activeParts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.part_number} - {p.description} (${p.selling_price.toFixed(2)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantity</Label>
            <Input type="number" min="1" value={partQty} onChange={(e) => setPartQty(e.target.value)} />
          </div>
        </div>
      </QuickAddDialog>

      {/* Add Labor Dialog */}
      <QuickAddDialog open={addLaborDialogOpen} onOpenChange={setAddLaborDialogOpen} title="Add Labor" onSave={handleAddLabor} onCancel={() => setAddLaborDialogOpen(false)}>
        <div className="space-y-4">
          <div>
            <Label>Description *</Label>
            <Textarea value={laborDescription} onChange={(e) => setLaborDescription(e.target.value)} placeholder="Describe the work performed" rows={2} />
          </div>
          <div>
            <Label>Technician</Label>
            <Select value={laborTechnicianId} onValueChange={setLaborTechnicianId}>
              <SelectTrigger><SelectValue placeholder="Select technician (optional)" /></SelectTrigger>
              <SelectContent>
                {activeTechnicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Hours</Label>
            <Input type="number" min="0.25" step="0.25" value={laborHours} onChange={(e) => setLaborHours(e.target.value)} />
          </div>
        </div>
      </QuickAddDialog>

      {/* Invoice Confirmation Dialog */}
      <AlertDialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invoice this Work Order?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently lock the order. Active time entries will be clocked out.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleInvoice}>Invoice Order</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Core Return Confirmation Dialog */}
      <AlertDialog open={showCoreReturnDialog} onOpenChange={setShowCoreReturnDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Core Returned?</AlertDialogTitle>
            <AlertDialogDescription>This will create a refund/credit line for the core deposit.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMarkCoreReturned}>Mark Returned</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
