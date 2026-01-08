import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRepos } from '@/repos';
import { useToast } from '@/hooks/use-toast';
import { Save, Plus, Trash2, FileCheck, Printer, Edit, X, Shield, RotateCcw, Check, Pencil, X as XIcon } from 'lucide-react';
import { QuickAddDialog } from '@/components/ui/quick-add-dialog';
import { PrintSalesOrder, PrintSalesOrderPickList } from '@/components/print/PrintInvoice';
import { calcPartPriceForLevel } from '@/domain/pricing/partPricing';
import { getPurchaseOrderDerivedStatus } from '@/services/purchaseOrderStatus';
import { StatusBadge } from '@/components/ui/status-badge';
import { PurchaseOrderPreviewDialog } from '@/components/purchase-orders/PurchaseOrderPreviewDialog';
import type { SalesOrderStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

export default function SalesOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const repos = useRepos();
  const {
    salesOrders,
    getSalesOrderLines,
    createSalesOrder,
    soAddPartLine,
    soUpdatePartQty,
    soUpdateLineUnitPrice,
    soRemovePartLine,
    soToggleWarranty,
    soToggleCoreReturned,
    soConvertToOpen,
    soInvoice,
    soSetStatus,
    updateSalesOrderNotes,
    getSalesOrderChargeLines,
    addSalesOrderChargeLine,
    updateSalesOrderChargeLine,
    removeSalesOrderChargeLine,
  } = repos.salesOrders;
  const { purchaseOrders, purchaseOrderLines } = repos.purchaseOrders;
  const { customers, addCustomer } = repos.customers;
  const { units } = repos.units;
  const { parts, addPart } = repos.parts;
  const { vendors } = repos.vendors;
  const { categories } = repos.categories;
  const { settings } = repos.settings;
  const { toast } = useToast();

  const unitFromQuery = searchParams.get('unit_id') || '';
  const createdParam = searchParams.get('created');
  const location = useLocation();
  const NONE_UNIT = '__NONE__';
  const isNew = id === 'new';
  const [selectedCustomerId, setSelectedCustomerId] = useState(searchParams.get('customer_id') || '');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(unitFromQuery || null);
  const [order, setOrder] = useState(() => {
    if (!isNew) return salesOrders.find((o) => o.id === id);
    return null;
  });

  const [addPartDialogOpen, setAddPartDialogOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [newPartDialogOpen, setNewPartDialogOpen] = useState(false);
  const [newPartData, setNewPartData] = useState({
    part_number: '',
    description: '',
    vendor_id: '',
    category_id: '',
    cost: '',
    selling_price: '',
  });

  const [quickAddCustomerOpen, setQuickAddCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [editingPriceLineId, setEditingPriceLineId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState<string>('');
  
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  const initialFocusRequested = useRef(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showCoreReturnDialog, setShowCoreReturnDialog] = useState(false);
  const [coreReturnLineId, setCoreReturnLineId] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<'invoice' | 'picklist'>('invoice');

  const currentOrder = salesOrders.find((o) => o.id === id) || order;
  const customer = customers.find((c) => c.id === (currentOrder?.customer_id || selectedCustomerId));
  const unit = units.find((u) => u.id === (currentOrder?.unit_id || selectedUnitId));

  const activeCustomers = customers.filter((c) => c.is_active);
  const customerUnits = useMemo(() => {
    if (!selectedCustomerId || selectedCustomerId === 'walkin') return [];
    return units.filter((u) => u.customer_id === selectedCustomerId && u.is_active);
  }, [selectedCustomerId, units]);
  const activeParts = parts.filter((p) => p.is_active);
  const activeVendors = vendors.filter((v) => v.is_active);
  const activeCategories = categories.filter((c) => c.is_active);

  const isInvoiced = currentOrder?.status === 'INVOICED';
  const isEstimate = currentOrder?.status === 'ESTIMATE';
  const isCancelled = currentOrder?.status === 'CANCELLED';
  const isLocked = isInvoiced || isCancelled;
  const isCustomerOnHold = Boolean(customer?.credit_hold);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  const [quickPartSearch, setQuickPartSearch] = useState('');
  const [quickQty, setQuickQty] = useState('1');
  const quickPartInputRef = useRef<HTMLInputElement | null>(null);
  const statusLabel =
    currentOrder?.status === 'INVOICED'
      ? 'Invoiced'
      : currentOrder?.status === 'ESTIMATE'
      ? 'Estimate'
      : currentOrder?.status === 'PARTIAL'
      ? 'Partial'
      : currentOrder?.status === 'COMPLETED'
      ? 'Completed'
      : currentOrder?.status === 'CANCELLED'
      ? 'Cancelled'
      : 'Open';
  const orderLines = currentOrder ? getSalesOrderLines(currentOrder.id) : [];
  const quickInvoiceIssues = useMemo(() => {
    const issues: string[] = [];
    if (!currentOrder) issues.push('Order missing');
    if (isLocked) issues.push('Order is locked');
    if (currentOrder?.status === 'ESTIMATE') issues.push('Convert estimate before invoicing');
    if (isCustomerOnHold) issues.push('Customer on credit hold');
    if (!orderLines.length) issues.push('Add at least one line');
    const hasInvalidQty = orderLines.some((l) => l.quantity <= 0);
    if (hasInvalidQty) issues.push('Line quantities must be > 0');
    return issues;
  }, [currentOrder, isCustomerOnHold, isLocked, orderLines]);

  if (!isNew && !currentOrder) {
    return (
      <div className="page-container">
        <PageHeader title="Order Not Found" backTo="/sales-orders" />
        <p className="text-muted-foreground">This sales order does not exist.</p>
      </div>
    );
  }

  const handleCreateOrder = () => {
    if (!selectedCustomerId) {
      toast({ title: 'Error', description: 'Please select a customer', variant: 'destructive' });
      return;
    }
    const newOrder = createSalesOrder(selectedCustomerId, selectedUnitId);
    navigate(`/sales-orders/${newOrder.id}`, { replace: true, state: { justCreated: true } });
    setOrder(newOrder);
    toast({ title: 'Order Created', description: `Sales Order ${newOrder.order_number} created` });
    setIsDirty(false);
  };

  const handleAddPart = () => {
    if (!selectedPartId || !currentOrder) return;
    if (isLocked) {
      toast({ title: 'Locked', description: 'Order is locked and cannot be edited.', variant: 'destructive' });
      return;
    }
    const qty = parseInt(partQty) || 1;
    const result = soAddPartLine(currentOrder.id, selectedPartId, qty);
    if (result.success) {
      toast({ title: 'Part Added' });
      setAddPartDialogOpen(false);
      setSelectedPartId('');
      setPartQty('1');
      setIsDirty(true);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const quickSelectedPart = useMemo(() => {
    const search = quickPartSearch.trim().toLowerCase();
    if (!search) return null;
    return (
      activeParts.find(
        (p) => p.part_number.toLowerCase() === search || (p.barcode && p.barcode.toLowerCase() === search)
      ) || null
    );
  }, [activeParts, quickPartSearch]);

  const handleQuickAdd = () => {
    if (!currentOrder) return;
    if (isLocked) {
      toast({ title: 'Locked', description: 'Order is locked and cannot be edited.', variant: 'destructive' });
      return;
    }
    if (!quickSelectedPart) {
      toast({ title: 'Select a part', variant: 'destructive' });
      return;
    }
    const qtyNum = Number(quickQty);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      toast({ title: 'Invalid quantity', description: 'Quantity must be greater than 0', variant: 'destructive' });
      return;
    }
    const result = soAddPartLine(currentOrder.id, quickSelectedPart.id, qtyNum);
    if (!result.success) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      return;
    }
    setQuickQty('1');
    setQuickPartSearch('');
    setIsDirty(true);
    toast({ title: 'Line Added', description: `${quickSelectedPart.part_number} added/updated` });
    setTimeout(() => {
      quickPartInputRef.current?.focus();
      quickPartInputRef.current?.select();
    }, 0);
  };

  const handleUpdateQty = (lineId: string, newQty: number) => {
    if (isLocked) {
      toast({ title: 'Locked', description: 'Order is locked and cannot be edited.', variant: 'destructive' });
      return;
    }
    if (newQty <= 0) {
      handleRemoveLine(lineId);
      return;
    }
    const result = soUpdatePartQty(lineId, newQty);
    if (!result.success) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      setIsDirty(true);
    }
  };

  const handleSetStatus = (status: SalesOrderStatus) => {
    if (!currentOrder) return;
    const result = soSetStatus(currentOrder.id, status);
    if (!result.success) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      return;
    }
    setOrder((prev) => (prev && prev.id === currentOrder.id ? { ...prev, status } : prev || currentOrder));
    toast({ title: 'Status Updated', description: `Order marked ${status.toLowerCase()}` });
  };

  const handleRemoveLine = (lineId: string) => {
    if (isLocked) {
      toast({ title: 'Locked', description: 'Order is locked and cannot be edited.', variant: 'destructive' });
      return;
    }
    const result = soRemovePartLine(lineId);
    if (!result.success) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      setIsDirty(true);
    }
  };

  const handleInvoice = async () => {
    if (!currentOrder) return;
    if (isCustomerOnHold) {
      toast({
        title: 'Credit Hold',
        description: 'Cannot invoice while customer is on credit hold.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const { invoiceId } = await repos.invoices.createFromSalesOrder({ salesOrderId: currentOrder.id });
      const result = soInvoice(currentOrder.id);
      if (result.success) {
        toast({ title: 'Order Invoiced' });
        setShowInvoiceDialog(false);
        setIsDirty(false);
        navigate(`/invoices/${invoiceId}`);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create invoice',
        variant: 'destructive',
      });
    }
  };

  const handleQuickInvoiceAndPrint = () => {
    if (quickInvoiceIssues.length > 0 || !currentOrder) return;
    if (currentOrder.status === 'ESTIMATE') {
      const convert = soConvertToOpen(currentOrder.id);
      if (!convert.success) {
        toast({ title: 'Error', description: convert.error, variant: 'destructive' });
        return;
      }
      setOrder((prev) => (prev && prev.id === currentOrder.id ? { ...prev, status: 'OPEN' } : prev || currentOrder));
    }
    const result = soInvoice(currentOrder.id);
    if (!result.success) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Order Invoiced' });
    setPrintMode('invoice');
    setTimeout(() => window.print(), 0);
  };

  const handleQuickAddCustomer = () => {
    if (!newCustomerName.trim()) return;
    const result = addCustomer({
      company_name: newCustomerName.trim(),
      contact_name: null,
      phone: null,
      email: null,
      address: null,
      notes: null,
      price_level: 'RETAIL',
      is_tax_exempt: false,
      tax_rate_override: null,
    });
    if (!result.success || !result.customer) {
      toast({ title: 'Unable to add customer', description: result.error, variant: 'destructive' });
      return;
    }
    setSelectedCustomerId(result.customer.id);
    setQuickAddCustomerOpen(false);
    setNewCustomerName('');
    toast({ title: 'Customer Added' });
  };

  const handleQuickAddPart = () => {
    if (!newPartData.part_number.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Part number is required',
        variant: 'destructive',
      });
      return;
    }
    if (!newPartData.vendor_id) {
      toast({
        title: 'Validation Error',
        description: 'Vendor is required',
        variant: 'destructive',
      });
      return;
    }
    if (!newPartData.category_id) {
      toast({
        title: 'Validation Error',
        description: 'Category is required',
        variant: 'destructive',
      });
      return;
    }

    const exists = parts.some(
      (p) => (p.part_number || '').toLowerCase() === newPartData.part_number.trim().toLowerCase()
    );
    if (exists) {
      toast({
        title: 'Validation Error',
        description: 'A part with this number already exists',
        variant: 'destructive',
      });
      return;
    }

    const partNumber = newPartData.part_number.trim().toUpperCase();
    const newPart = addPart({
      part_number: partNumber,
      description: newPartData.description.trim() || null,
      vendor_id: newPartData.vendor_id,
      category_id: newPartData.category_id,
      cost: parseFloat(newPartData.cost) || 0,
      selling_price: parseFloat(newPartData.selling_price) || 0,
      quantity_on_hand: 0,
      core_required: false,
      core_charge: 0,
      min_qty: null,
      max_qty: null,
      bin_location: null,
      model: null,
      serial_number: null,
      is_kit: false,
      barcode: null,
    });

    toast({
      title: 'Part Created',
      description: `${partNumber} has been added`,
    });
    setNewPartDialogOpen(false);
    setNewPartData({
      part_number: '',
      description: '',
      vendor_id: '',
      category_id: '',
      cost: '',
      selling_price: '',
    });
    setSelectedPartId(newPart.id);
    setIsDirty(true);
  };

  const handleEditNotes = () => {
    setNotesValue(currentOrder?.notes || '');
    setIsEditingNotes(true);
  };

  const isNewlyCreated = Boolean(createdParam === '1' || location.state?.justCreated);
  useEffect(() => {
    if (!isNewlyCreated) return;
    if (initialFocusRequested.current) return;
    initialFocusRequested.current = true;
    requestAnimationFrame(() => {
      notesRef.current?.focus();
    });
  }, [isNewlyCreated]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    const handlePopState = () => {
      if (!isDirty) return;
      const confirmLeave = window.confirm('You have unsaved changes. Leave without saving?');
      if (!confirmLeave) {
        window.history.pushState(null, '', location.pathname + location.search + location.hash);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDirty, location.pathname, location.search, location.hash]);

  const handleSaveNotes = () => {
    if (!currentOrder) return;
    updateSalesOrderNotes(currentOrder.id, notesValue.trim() || null);
    setIsEditingNotes(false);
    toast({ title: 'Notes Updated' });
    setIsDirty(false);
  };

  const handleMarkCoreReturned = (lineId: string) => {
    setCoreReturnLineId(lineId);
    setShowCoreReturnDialog(true);
  };

  const handleConvertToOpen = () => {
    if (!currentOrder) return;
    const result = soConvertToOpen(currentOrder.id);
    if (result.success) {
      setOrder(null);
      toast({
        title: 'Order Converted',
        description: 'Estimate converted to sales order',
      });
      setIsDirty(false);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const confirmMarkCoreReturned = () => {
    if (!coreReturnLineId) return;
    const result = repos.salesOrders.soMarkCoreReturned(coreReturnLineId);
    if (result.success) {
      toast({ title: 'Core Returned', description: 'Refund line has been created' });
      setIsDirty(true);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setShowCoreReturnDialog(false);
    setCoreReturnLineId(null);
  };

  const poLinesByPo = useMemo(() => {
    return purchaseOrderLines.reduce<Record<string, typeof purchaseOrderLines>>((acc, line) => {
      acc[line.purchase_order_id] = acc[line.purchase_order_id] || [];
      acc[line.purchase_order_id].push(line);
      return acc;
    }, {});
  }, [purchaseOrderLines]);
  const linkedPurchaseOrders = useMemo(() => {
    if (!currentOrder) return [];
    return purchaseOrders
      .filter((po) => po.sales_order_id === currentOrder.id)
      .map((po) => ({
        ...po,
        derivedStatus: getPurchaseOrderDerivedStatus(po, poLinesByPo[po.id] || []),
      }));
  }, [currentOrder, poLinesByPo, purchaseOrders]);
  const priceLevelLabel =
    customer?.price_level === 'WHOLESALE'
      ? 'Wholesale'
      : customer?.price_level === 'FLEET'
      ? 'Fleet'
      : 'Retail';
  
  // Separate part lines and refund lines for display
  const partLines = orderLines.filter((l) => !l.is_core_refund_line);
  const refundLines = orderLines.filter((l) => l.is_core_refund_line);

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
                  if (!unitFromQuery) {
                    setSelectedUnitId(null);
                  }
                  setIsDirty(true);
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

            {selectedCustomerId && selectedCustomerId !== 'walkin' && customerUnits.length > 0 && (
              <div>
                <Label>Unit (optional)</Label>
                <Select
                  value={selectedUnitId && selectedUnitId !== '' ? selectedUnitId : unitFromQuery || NONE_UNIT}
                  onValueChange={(v) => {
                    setSelectedUnitId(v === NONE_UNIT ? null : v);
                    if (!unitFromQuery) {
                      setIsDirty(true);
                    }
                  }}
                  disabled={!!unitFromQuery}
                >
                  <SelectTrigger disabled={!!unitFromQuery}>
                    <SelectValue placeholder="Select unit (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_UNIT}>No unit</SelectItem>
                    {customerUnits.map((u) => (
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
              {isNew ? 'Create Order' : 'Save'}
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
        subtitle={statusLabel}
        backTo="/sales-orders"
        description={
          unit ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => navigate(`/units/${unit.id}`)}
            >
              {unit.unit_name || 'Unit'} {unit.vin ? `• ${unit.vin}` : ''}
            </Button>
          ) : undefined
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {currentOrder && <StatusBadge status={currentOrder.status} />}
            {currentOrder?.order_number && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(currentOrder.order_number);
                  toast({ title: 'Copied', description: 'Sales order number copied' });
                }}
              >
                Copy SO #
              </Button>
            )}
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPrintMode('picklist');
                setTimeout(() => window.print(), 0);
              }}
            >
              <Printer className="w-4 h-4 mr-2" />
              Pick List
            </Button>
            {!isLocked && (
              <>
                {isEstimate ? (
                  <Button onClick={handleConvertToOpen}>
                    <Save className="w-4 h-4 mr-2" />
                    Convert to Sales Order
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => handleSetStatus('PARTIAL')}>
                      Mark Partial
                    </Button>
                    <Button variant="outline" onClick={() => handleSetStatus('COMPLETED')}>
                      Mark Completed
                    </Button>
                    <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Save className="w-4 h-4 mr-2" />
                          Cancel Order
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel sales order?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will lock the order but keep history. Inventory will not change.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Order</AlertDialogCancel>
                          <AlertDialogAction asChild>
                            <Button
                              variant="destructive"
                              onClick={() => {
                                handleSetStatus('CANCELLED');
                                setCancelDialogOpen(false);
                              }}
                            >
                              Cancel Order
                            </Button>
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      onClick={() => setShowInvoiceDialog(true)}
                      disabled={isCustomerOnHold}
                      title={isCustomerOnHold ? 'Customer is on credit hold' : undefined}
                    >
                      <FileCheck className="w-4 h-4 mr-2" />
                      Invoice
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        }
      />

      {isCustomerOnHold && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Customer is on Credit Hold</AlertTitle>
          <AlertDescription>{customer?.credit_hold_reason || 'Resolve hold before invoicing.'}</AlertDescription>
        </Alert>
      )}
      {isCancelled && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Order Cancelled</AlertTitle>
          <AlertDescription>This order is cancelled and cannot be edited.</AlertDescription>
        </Alert>
      )}

      {!isLocked && (
        <Card className="mb-4 p-4 space-y-3 no-print">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Quick Sale Mode</h3>
                {quickMode && <Badge variant="secondary">Quick</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                Fast add and invoice with keyboard-friendly flow.
              </p>
            </div>
            <Button
              variant={quickMode ? 'default' : 'outline'}
              onClick={() => {
                setQuickMode((prev) => {
                  const next = !prev;
                  if (next) {
                    setTimeout(() => quickPartInputRef.current?.focus(), 0);
                  } else {
                    setQuickPartSearch('');
                    setQuickQty('1');
                  }
                  return next;
                });
              }}
            >
              {quickMode ? 'Exit Quick Mode' : 'Enter Quick Mode'}
            </Button>
          </div>
          {quickMode && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-[2fr_auto_auto] gap-3 items-end">
                <div className="space-y-1">
                  <Label>Part or Barcode</Label>
                  <Input
                    ref={quickPartInputRef}
                    value={quickPartSearch}
                    onChange={(e) => {
                      setQuickPartSearch(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickAdd();
                      } else if (e.key === 'Tab') {
                        // default behavior ok
                      }
                    }}
                    placeholder="Scan or type part number"
                    autoFocus
                  />
                  {quickSelectedPart && (
                    <p className="text-xs text-muted-foreground">
                      {quickSelectedPart.part_number} — {quickSelectedPart.description || 'No description'}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quickQty}
                    onChange={(e) => setQuickQty(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickAdd();
                      } else if (e.key === 'Tab') {
                        // allow tab
                      }
                    }}
                    className="w-24"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="invisible">Add</Label>
                  <Button onClick={handleQuickAdd} className="w-full">
                    Add / Increment
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Button
                  onClick={handleQuickInvoiceAndPrint}
                  disabled={quickInvoiceIssues.length > 0}
                  title={quickInvoiceIssues[0] || undefined}
                >
                  Invoice + Print Receipt
                </Button>
                {quickInvoiceIssues.length > 0 && (
                  <ul className="list-disc list-inside text-destructive text-xs">
                    {quickInvoiceIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

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
            <div className="pt-2 border-t border-border space-y-2">
              <p className="text-sm font-medium">Purchase Orders</p>
              {linkedPurchaseOrders.length === 0 ? (
                <p className="text-xs text-muted-foreground">No purchase orders linked.</p>
              ) : (
                <div className="space-y-2">
                  {linkedPurchaseOrders.map((po) => (
                    <div key={po.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="space-y-1">
                        <p className="font-medium">{po.po_number || po.id}</p>
                        <StatusBadge status={po.derivedStatus} />
                      </div>
                      <PurchaseOrderPreviewDialog
                        poId={po.id}
                        trigger={
                          <Button variant="outline" size="sm">
                            View PO
                          </Button>
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Notes Section */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">Notes:</span>
              {!isLocked && !isEditingNotes && (
                <Button variant="ghost" size="sm" onClick={handleEditNotes}>
                  <Edit className="w-3 h-3" />
                </Button>
              )}
            </div>
            {isEditingNotes ? (
              <div className="space-y-2">
                <Textarea
                  ref={notesRef}
                  value={notesValue}
                  onChange={(e) => {
                    setNotesValue(e.target.value);
                    setIsDirty(true);
                  }}
                  rows={3}
                  placeholder="Add notes..."
                />
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
            {!isLocked && (
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
                  {!isLocked && <TableHead className="w-10"></TableHead>}
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
                          {!isLocked ? (
                            <Checkbox
                              checked={line.is_warranty}
                              onCheckedChange={() => {
                                soToggleWarranty(line.id);
                                setIsDirty(true);
                              }}
                            />
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
                          {isLocked ? line.quantity : (
                            <Input type="number" min="1" value={line.quantity} onChange={(e) => handleUpdateQty(line.id, parseInt(e.target.value) || 0)} className="w-16 text-right" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isLocked ? (
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
                                  const result = soUpdateLineUnitPrice(line.id, parsed);
                                  if (!result.success) {
                                    toast({ title: 'Error', description: result.error, variant: 'destructive' });
                                    return;
                                  }
                                  setEditingPriceLineId(null);
                                  setPriceDraft('');
                                  setIsDirty(true);
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
                                  const suggested = part ? calcPartPriceForLevel(part, settings, customer?.price_level ?? 'RETAIL') : null;
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
                        {!isLocked && (
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
        <>
          {printMode === 'invoice' && (
            <PrintSalesOrder order={currentOrder} lines={orderLines} customer={customer} unit={unit} parts={parts} shopName={settings.shop_name} />
          )}
          {printMode === 'picklist' && (
            <PrintSalesOrderPickList order={currentOrder} lines={orderLines} customer={customer} unit={unit} parts={parts} shopName={settings.shop_name} />
          )}
        </>
      )}

      {/* Add Part Dialog */}
      <QuickAddDialog open={addPartDialogOpen} onOpenChange={setAddPartDialogOpen} title="Add Part" onSave={handleAddPart} onCancel={() => setAddPartDialogOpen(false)}>
        <div className="space-y-4">
          <div>
            <Label>Part *</Label>
            <div className="flex gap-2">
              <Select value={selectedPartId} onValueChange={setSelectedPartId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select part" /></SelectTrigger>
                <SelectContent>
                  {activeParts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.part_number} - {p.description} (${p.selling_price.toFixed(2)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setNewPartDialogOpen(true)}>
                New Part
              </Button>
            </div>
          </div>
          <div>
            <Label>Quantity</Label>
            <Input type="number" min="1" value={partQty} onChange={(e) => setPartQty(e.target.value)} />
          </div>
        </div>
      </QuickAddDialog>

      {/* Quick Add Part Dialog */}
      <QuickAddDialog
        open={newPartDialogOpen}
        onOpenChange={setNewPartDialogOpen}
        title="New Part"
        onSave={handleQuickAddPart}
        onCancel={() => setNewPartDialogOpen(false)}
      >
        <div className="space-y-3">
          <div>
            <Label>Part Number *</Label>
            <Input
              value={newPartData.part_number}
              onChange={(e) => setNewPartData({ ...newPartData, part_number: e.target.value.toUpperCase() })}
              placeholder="e.g., BRK-001"
              className="font-mono"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={newPartData.description}
              onChange={(e) => setNewPartData({ ...newPartData, description: e.target.value })}
              rows={2}
              placeholder="Part description"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vendor *</Label>
              <Select
                value={newPartData.vendor_id}
                onValueChange={(value) => setNewPartData({ ...newPartData, vendor_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {activeVendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category *</Label>
              <Select
                value={newPartData.category_id}
                onValueChange={(value) => setNewPartData({ ...newPartData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {activeCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cost</Label>
              <Input
                type="number"
                step="0.01"
                value={newPartData.cost}
                onChange={(e) => setNewPartData({ ...newPartData, cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Selling Price</Label>
              <Input
                type="number"
                step="0.01"
                value={newPartData.selling_price}
                onChange={(e) => setNewPartData({ ...newPartData, selling_price: e.target.value })}
                placeholder="0.00"
              />
            </div>
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
