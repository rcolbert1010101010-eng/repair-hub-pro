import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useShopStore } from '@/stores/shopStore';
import { useToast } from '@/hooks/use-toast';
import { Save, Plus, Trash2, FileCheck, Printer, Play } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { QuickAddDialog } from '@/components/ui/quick-add-dialog';

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    workOrders,
    customers,
    units,
    parts,
    settings,
    getWorkOrderPartLines,
    getWorkOrderLaborLines,
    createWorkOrder,
    woAddPartLine,
    woUpdatePartQty,
    woRemovePartLine,
    woAddLaborLine,
    woUpdateLaborLine,
    woRemoveLaborLine,
    woUpdateStatus,
    woInvoice,
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

  const [addLaborDialogOpen, setAddLaborDialogOpen] = useState(false);
  const [laborDescription, setLaborDescription] = useState('');
  const [laborHours, setLaborHours] = useState('1');

  const [quickAddCustomerOpen, setQuickAddCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [quickAddUnitOpen, setQuickAddUnitOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');

  const currentOrder = order || workOrders.find((o) => o.id === id);
  const activeCustomers = customers.filter((c) => c.is_active && c.id !== 'walkin');
  const customerUnits = useMemo(() => {
    const custId = selectedCustomerId || currentOrder?.customer_id;
    if (!custId) return [];
    return units.filter((u) => u.customer_id === custId && u.is_active);
  }, [selectedCustomerId, currentOrder?.customer_id, units]);
  const activeParts = parts.filter((p) => p.is_active);

  const isInvoiced = currentOrder?.status === 'INVOICED';

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
      toast({ title: 'Part Added', description: 'Part has been added to the order' });
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
    if (result.success) {
      toast({ title: 'Part Removed', description: 'Part has been removed from the order' });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleAddLabor = () => {
    if (!laborDescription.trim() || !currentOrder) return;
    const hours = parseFloat(laborHours) || 1;
    const result = woAddLaborLine(currentOrder.id, laborDescription.trim(), hours);
    if (result.success) {
      toast({ title: 'Labor Added', description: 'Labor line has been added' });
      setAddLaborDialogOpen(false);
      setLaborDescription('');
      setLaborHours('1');
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleRemoveLaborLine = (lineId: string) => {
    const result = woRemoveLaborLine(lineId);
    if (result.success) {
      toast({ title: 'Labor Removed', description: 'Labor line has been removed' });
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
    toast({ title: 'Customer Added', description: `${newCustomer.company_name} created` });
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
    toast({ title: 'Unit Added', description: `${newUnit.unit_name} created` });
  };

  const customer = customers.find((c) => c.id === (currentOrder?.customer_id || selectedCustomerId));
  const unit = units.find((u) => u.id === (currentOrder?.unit_id || selectedUnitId));
  const partLines = currentOrder ? getWorkOrderPartLines(currentOrder.id) : [];
  const laborLines = currentOrder ? getWorkOrderLaborLines(currentOrder.id) : [];

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

        <QuickAddDialog
          open={quickAddCustomerOpen}
          onOpenChange={setQuickAddCustomerOpen}
          title="Quick Add Customer"
          onSave={handleQuickAddCustomer}
          onCancel={() => setQuickAddCustomerOpen(false)}
        >
          <div>
            <Label>Company Name *</Label>
            <Input
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              placeholder="Enter company name"
            />
          </div>
        </QuickAddDialog>

        <QuickAddDialog
          open={quickAddUnitOpen}
          onOpenChange={setQuickAddUnitOpen}
          title="Quick Add Unit"
          onSave={handleQuickAddUnit}
          onCancel={() => setQuickAddUnitOpen(false)}
        >
          <div>
            <Label>Unit Name *</Label>
            <Input
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              placeholder="Enter unit name"
            />
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
          !isInvoiced && (
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
              <Button onClick={handleInvoice}>
                <FileCheck className="w-4 h-4 mr-2" />
                Invoice
              </Button>
            </>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Info */}
        <div className="form-section">
          <h2 className="text-lg font-semibold mb-4">Order Information</h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Customer:</span>
              <p className="font-medium">{customer?.company_name || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Unit:</span>
              <p className="font-medium">{unit?.unit_name || '-'}</p>
              {unit?.vin && <p className="text-xs text-muted-foreground font-mono">{unit.vin}</p>}
              {unit?.year && unit?.make && unit?.model && (
                <p className="text-xs text-muted-foreground">{unit.year} {unit.make} {unit.model}</p>
              )}
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
        </div>

        {/* Parts & Labor */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="parts" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="parts">Parts ({partLines.length})</TabsTrigger>
              <TabsTrigger value="labor">Labor ({laborLines.length})</TabsTrigger>
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
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      {!isInvoiced && <TableHead className="w-10"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partLines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No parts added yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      partLines.map((line) => {
                        const part = parts.find((p) => p.id === line.part_id);
                        return (
                          <TableRow key={line.id}>
                            <TableCell className="font-mono">{part?.part_number || '-'}</TableCell>
                            <TableCell>{part?.description || '-'}</TableCell>
                            <TableCell className="text-right">
                              {isInvoiced ? (
                                line.quantity
                              ) : (
                                <Input
                                  type="number"
                                  min="1"
                                  value={line.quantity}
                                  onChange={(e) => handleUpdateQty(line.id, parseInt(e.target.value) || 0)}
                                  className="w-20 text-right"
                                />
                              )}
                            </TableCell>
                            <TableCell className="text-right">${line.unit_price.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">${line.line_total.toFixed(2)}</TableCell>
                            {!isInvoiced && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemovePartLine(line.id)}
                                  className="text-destructive hover:text-destructive"
                                >
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
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      {!isInvoiced && <TableHead className="w-10"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {laborLines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No labor added yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      laborLines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>{line.description}</TableCell>
                          <TableCell className="text-right">{line.hours}</TableCell>
                          <TableCell className="text-right">${line.rate.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">${line.line_total.toFixed(2)}</TableCell>
                          {!isInvoiced && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveLaborLine(line.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
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

      {/* Add Part Dialog */}
      <QuickAddDialog
        open={addPartDialogOpen}
        onOpenChange={setAddPartDialogOpen}
        title="Add Part"
        onSave={handleAddPart}
        onCancel={() => setAddPartDialogOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <Label>Part *</Label>
            <Select value={selectedPartId} onValueChange={setSelectedPartId}>
              <SelectTrigger>
                <SelectValue placeholder="Select part" />
              </SelectTrigger>
              <SelectContent>
                {activeParts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.part_number} - {p.description} (${p.selling_price.toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              value={partQty}
              onChange={(e) => setPartQty(e.target.value)}
            />
          </div>
        </div>
      </QuickAddDialog>

      {/* Add Labor Dialog */}
      <QuickAddDialog
        open={addLaborDialogOpen}
        onOpenChange={setAddLaborDialogOpen}
        title="Add Labor"
        onSave={handleAddLabor}
        onCancel={() => setAddLaborDialogOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <Label>Description *</Label>
            <Textarea
              value={laborDescription}
              onChange={(e) => setLaborDescription(e.target.value)}
              placeholder="Describe the work performed"
              rows={2}
            />
          </div>
          <div>
            <Label>Hours</Label>
            <Input
              type="number"
              min="0.25"
              step="0.25"
              value={laborHours}
              onChange={(e) => setLaborHours(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Rate: ${settings.default_labor_rate}/hr (snapshotted at time of creation)
            </p>
          </div>
        </div>
      </QuickAddDialog>
    </div>
  );
}
