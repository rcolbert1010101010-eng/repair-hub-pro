import { useEffect, useMemo, useState } from 'react';
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
import { useShopStore } from '@/stores/shopStore';
import { useToast } from '@/hooks/use-toast';
import { Save, Plus, Trash2, FileCheck, Printer, Edit, X, Shield, RotateCcw } from 'lucide-react';
import { QuickAddDialog } from '@/components/ui/quick-add-dialog';
import { PrintSalesOrder } from '@/components/print/PrintInvoice';
import { supabase } from '@/integrations/supabase/client';
import { fetchParts } from '@/integrations/supabase/catalog';
import { fetchCustomers, createCustomer as createCustomerDb } from '@/integrations/supabase/customers';
import { fetchUnits } from '@/integrations/supabase/units';
import type { Part, Customer, Unit } from '@/types';

export default function SalesOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    salesOrders,
    settings,
    getSalesOrderLines,
    createSalesOrder,
    soAddPartLine,
    soUpdatePartQty,
    soRemovePartLine,
    soToggleWarranty,
    soToggleCoreReturned,
    updateSalesOrderNotes,
  } = useShopStore();
  const { toast } = useToast();

  const isNew = id === 'new';
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [order, setOrder] = useState(() => {
    if (!isNew) return salesOrders.find((o) => o.id === id);
    return null;
  });

  const [addPartDialogOpen, setAddPartDialogOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState('1');

  const [quickAddCustomerOpen, setQuickAddCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [parts, setParts] = useState<Part[]>([]);
  const [loadingParts, setLoadingParts] = useState(true);
  const [partsError, setPartsError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [unitsError, setUnitsError] = useState<string | null>(null);

  const currentOrder = order || salesOrders.find((o) => o.id === id);

  const activeCustomers = customers.filter((c) => c.is_active);
  const customerUnits = useMemo(() => {
    if (!selectedCustomerId || selectedCustomerId === 'walkin') return [];
    return units.filter((u) => u.customer_id === selectedCustomerId && u.is_active);
  }, [selectedCustomerId, units]);
  const activeParts = parts.filter((p) => p.is_active);
  const customerSelectPlaceholder = customersError ? 'Failed to load customers' : loadingCustomers ? 'Loading customers...' : 'Select customer';
  const unitSelectPlaceholder = unitsError ? 'Failed to load units' : loadingUnits ? 'Loading units...' : 'Select unit (optional)';
  const partSelectPlaceholder = partsError ? 'Failed to load parts' : loadingParts ? 'Loading parts...' : 'Select part';

  const isInvoiced = currentOrder?.status === 'INVOICED';

  if (!isNew && !currentOrder) {
    return (
      <div className="page-container">
        <PageHeader title="Order Not Found" backTo="/sales-orders" />
        <p className="text-muted-foreground">This sales order does not exist.</p>
      </div>
    );
  }

  const handleCreateOrder = async () => {
    if (!selectedCustomerId) {
      toast({ title: 'Error', description: 'Please select a customer', variant: 'destructive' });
      return;
    }
    try {
      const newOrder = await createSalesOrder(selectedCustomerId, selectedUnitId);
      navigate(`/sales-orders/${newOrder.id}`, { replace: true });
      setOrder(newOrder);
      toast({ title: 'Order Created', description: `Sales Order ${newOrder.order_number} created` });
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed to create order', variant: 'destructive' });
    }
  };

  const handleAddPart = async () => {
    if (!selectedPartId || !currentOrder) return;
    const qty = parseInt(partQty) || 1;
    const result = await soAddPartLine(currentOrder.id, selectedPartId, qty);
    if (result.success) {
      toast({ title: 'Part Added' });
      setAddPartDialogOpen(false);
      setSelectedPartId('');
      setPartQty('1');
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleUpdateQty = async (lineId: string, newQty: number) => {
    if (newQty <= 0) {
      await handleRemoveLine(lineId);
      return;
    }
    const result = await soUpdatePartQty(lineId, newQty);
    if (!result.success) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleRemoveLine = async (lineId: string) => {
    const result = await soRemovePartLine(lineId);
    if (!result.success) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setLoadingParts(true);
        setPartsError(null);
        const fetchedParts = await fetchParts();
        if (!isMounted) return;
        setParts(fetchedParts);
        useShopStore.setState((state) => ({
          ...state,
          parts: fetchedParts,
        }));
      } catch (e: any) {
        if (!isMounted) return;
        console.error('Failed to load parts', e);
        setPartsError(e?.message ?? 'Failed to load parts');
      } finally {
        if (!isMounted) return;
        setLoadingParts(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setLoadingUnits(true);
        setUnitsError(null);
        const fetchedUnits = await fetchUnits();
        if (!isMounted) return;
        setUnits(fetchedUnits);
      } catch (e: any) {
        if (!isMounted) return;
        console.error('Failed to load units', e);
        setUnitsError(e?.message ?? 'Failed to load units');
      } finally {
        if (!isMounted) return;
        setLoadingUnits(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setLoadingCustomers(true);
        setCustomersError(null);
        const fetchedCustomers = await fetchCustomers();
        if (!isMounted) return;
        setCustomers(fetchedCustomers);
      } catch (e: any) {
        if (!isMounted) return;
        console.error('Failed to load customers', e);
        setCustomersError(e?.message ?? 'Failed to load customers');
      } finally {
        if (!isMounted) return;
        setLoadingCustomers(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleInvoice = async () => {
    if (!currentOrder) return;

    try {
      const { data, error } = await supabase.rpc('invoice_sales_order', { p_order_id: currentOrder.id });
      if (error) throw error;

      if (data?.success === true || data?.already_invoiced === true) {
        toast({ title: 'Order Invoiced' });
        setShowInvoiceDialog(false);
        window.location.reload();
        return;
      }

      toast({
        title: 'Error',
        description: data?.error ?? 'Unable to invoice order',
        variant: 'destructive',
      });
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e?.message ?? 'Unable to invoice order',
        variant: 'destructive',
      });
    }
  };

  const handleQuickAddCustomer = async () => {
    if (!newCustomerName.trim()) return;
    try {
      const newCustomer = await createCustomerDb({
        company_name: newCustomerName.trim(),
        contact_name: null,
        phone: null,
        email: null,
        address: null,
        notes: null,
      });
      setCustomers((prev) => [...prev, newCustomer]);
    setSelectedCustomerId(newCustomer.id);
      setQuickAddCustomerOpen(false);
      setNewCustomerName('');
      toast({ title: 'Customer Added' });
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e?.message ?? 'Unable to add customer',
        variant: 'destructive',
      });
    }
  };

  const handleEditNotes = () => {
    setNotesValue(currentOrder?.notes || '');
    setIsEditingNotes(true);
  };

  const handleSaveNotes = () => {
    if (!currentOrder) return;
    updateSalesOrderNotes(currentOrder.id, notesValue.trim() || null);
    setIsEditingNotes(false);
    toast({ title: 'Notes Updated' });
  };

  const customer = customers.find((c) => c.id === (currentOrder?.customer_id || selectedCustomerId));
  const unit = units.find((u) => u.id === (currentOrder?.unit_id || selectedUnitId));
  const orderLines = currentOrder ? getSalesOrderLines(currentOrder.id) : [];

  // New order form
  if (isNew && !order) {
    return (
      <div className="page-container">
        <PageHeader title="New Sales Order" backTo="/sales-orders" />
        <div className="form-section max-w-xl">
          <h2 className="text-lg font-semibold mb-4">Order Details</h2>
          <div className="space-y-4">
            <div>
              <Label>Customer *</Label>
              <div className="flex gap-2">
                <Select value={selectedCustomerId} onValueChange={(v) => {
                  setSelectedCustomerId(v);
                  setSelectedUnitId(null);
                }}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={customerSelectPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCustomers
                      .filter((c) => c.id)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setQuickAddCustomerOpen(true)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {selectedCustomerId && selectedCustomerId !== 'walkin' && (
              <div>
                <Label>Unit (optional)</Label>
                <Select
                  value={selectedUnitId || ''}
                  onValueChange={(value) => setSelectedUnitId(value)}
                  disabled={loadingUnits || !!unitsError}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={unitSelectPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No unit</SelectItem>
                    {customerUnits
                      .filter((u) => u.id)
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.unit_name} {u.vin && `(${u.vin})`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedCustomerId === 'walkin' && (
              <p className="text-sm text-muted-foreground">Walk-in customers cannot have units assigned.</p>
            )}

            <Button onClick={handleCreateOrder} className="w-full">
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
      </div>
    );
  }

  // Existing order view
  return (
    <div className="page-container">
      <PageHeader
        title={currentOrder?.order_number || 'Sales Order'}
        subtitle={currentOrder?.status === 'INVOICED' ? 'Invoiced' : 'Open'}
        backTo="/sales-orders"
        actions={
          !isInvoiced ? (
            <>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
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
            {unit && (
              <div>
                <span className="text-muted-foreground">Unit:</span>
                <p className="font-medium">{unit.unit_name}</p>
                {unit.vin && <p className="text-xs text-muted-foreground font-mono">{unit.vin}</p>}
              </div>
            )}
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
        </div>

        {/* Parts */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Parts</h2>
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
                {orderLines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No parts added yet</TableCell>
                  </TableRow>
                ) : (
                  orderLines.map((line) => {
                    const part = parts.find((p) => p.id === line.part_id);
                    return (
                      <TableRow key={line.id} className={line.is_warranty ? 'bg-accent/30' : ''}>
                        <TableCell className="font-mono">{part?.part_number || '-'}</TableCell>
                        <TableCell>{part?.description || '-'}</TableCell>
                        <TableCell className="text-center">
                          {!isInvoiced ? (
                            <Checkbox checked={line.is_warranty} onCheckedChange={() => soToggleWarranty(line.id)} />
                          ) : line.is_warranty ? (
                            <Badge variant="secondary"><Shield className="w-3 h-3" /></Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-center">
                          {line.core_charge > 0 && (
                            <div className="flex items-center justify-center gap-1">
                              {!isInvoiced ? (
                                <Checkbox checked={line.core_returned} onCheckedChange={() => soToggleCoreReturned(line.id)} />
                              ) : line.core_returned ? (
                                <Badge variant="outline"><RotateCcw className="w-3 h-3" /></Badge>
                              ) : (
                                <Badge variant="destructive">${line.core_charge}</Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isInvoiced ? line.quantity : (
                            <Input type="number" min="1" value={line.quantity} onChange={(e) => handleUpdateQty(line.id, parseInt(e.target.value) || 0)} className="w-16 text-right" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">${line.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {line.is_warranty ? <span className="text-muted-foreground">$0.00</span> : `$${line.line_total.toFixed(2)}`}
                        </TableCell>
                        {!isInvoiced && (
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveLine(line.id)} className="text-destructive hover:text-destructive">
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

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>${currentOrder?.subtotal.toFixed(2)}</span>
              </div>
              {(currentOrder?.core_charges_total ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Core Charges:</span>
                  <span>${currentOrder?.core_charges_total.toFixed(2)}</span>
                </div>
              )}
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
        <PrintSalesOrder order={currentOrder} lines={orderLines} customer={customer} unit={unit} parts={parts} shopName={settings.shop_name} />
      )}

      {/* Add Part Dialog */}
      <QuickAddDialog open={addPartDialogOpen} onOpenChange={setAddPartDialogOpen} title="Add Part" onSave={handleAddPart} onCancel={() => setAddPartDialogOpen(false)}>
        <div className="space-y-4">
          <div>
            <Label>Part *</Label>
            <Select value={selectedPartId} onValueChange={setSelectedPartId}>
              <SelectTrigger><SelectValue placeholder={partSelectPlaceholder} /></SelectTrigger>
              <SelectContent>
                {partsError ? (
                  <SelectItem value="error" disabled>{partsError}</SelectItem>
                ) : (
                  activeParts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.part_number} - {p.description} (${p.selling_price.toFixed(2)})</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantity</Label>
            <Input type="number" min="1" value={partQty} onChange={(e) => setPartQty(e.target.value)} />
          </div>
        </div>
      </QuickAddDialog>

      {/* Invoice Confirmation Dialog */}
      <AlertDialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invoice this Order?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently lock the order. No further changes can be made after invoicing.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleInvoice}>Invoice Order</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
