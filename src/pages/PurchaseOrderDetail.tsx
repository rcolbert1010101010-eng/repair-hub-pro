import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter as ModalFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { useRepos } from '@/repos';
import { useToast } from '@/hooks/use-toast';
import { Save, Plus, Trash2, PackageCheck, Lock, ChevronsUpDown } from 'lucide-react';
import { QuickAddDialog } from '@/components/ui/quick-add-dialog';
import { getPurchaseOrderDerivedStatus } from '@/services/purchaseOrderStatus';
import { StatusBadge } from '@/components/ui/status-badge';

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const repos = useRepos();
  const {
    purchaseOrders,
    createPurchaseOrder,
    poAddLine,
    poRemoveLine,
    poReceive,
    poClose,
    getPurchaseOrderLines,
    updatePurchaseOrderLinks,
  } = repos.purchaseOrders;
  const { vendors } = repos.vendors;
  const { parts } = repos.parts;
  const { salesOrders } = repos.salesOrders;
  const { workOrders } = repos.workOrders;
  const { customers } = repos.customers;
  const { units } = repos.units;
  const { getReturnsByPurchaseOrder, createReturn } = repos.returns;
  const { toast } = useToast();

  const isNew = id === 'new';
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [order, setOrder] = useState(() => (!isNew ? purchaseOrders.find((o) => o.id === id) : null));

  const [addPartOpen, setAddPartOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState('1');

  const [receiveLineId, setReceiveLineId] = useState<string | null>(null);
  const [receiveQty, setReceiveQty] = useState('');
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [linkSalesOrderId, setLinkSalesOrderId] = useState('');
  const [linkWorkOrderId, setLinkWorkOrderId] = useState('');
  const [openSalesOrderPicker, setOpenSalesOrderPicker] = useState(false);
  const [openWorkOrderPicker, setOpenWorkOrderPicker] = useState(false);
  const [soQuery, setSoQuery] = useState('');
  const [woQuery, setWoQuery] = useState('');
  const [soStatusFilter, setSoStatusFilter] = useState<'all' | 'open' | 'estimate' | 'invoiced'>('open');
  const [woStatusFilter, setWoStatusFilter] = useState<'all' | 'open' | 'estimate' | 'invoiced'>('open');
  const [showLinkConflictDialog, setShowLinkConflictDialog] = useState(false);
  const [showInvoicedDialog, setShowInvoicedDialog] = useState(false);
  const [openWorkOrderPreview, setOpenWorkOrderPreview] = useState(false);

  const currentOrder = order || purchaseOrders.find((o) => o.id === id);
  const activeVendors = vendors.filter((v) => v.is_active);
  const activeParts = parts.filter((p) => p.is_active);
  const isClosed = currentOrder?.status === 'CLOSED';

  if (!isNew && !currentOrder) {
    return (
      <div className="page-container">
        <PageHeader title="PO Not Found" backTo="/purchase-orders" />
        <p className="text-muted-foreground">This purchase order does not exist.</p>
      </div>
    );
  }

  const handleCreate = () => {
    if (!selectedVendorId) {
      toast({ title: 'Error', description: 'Please select a vendor', variant: 'destructive' });
      return;
    }
    const newOrder = createPurchaseOrder(selectedVendorId);
    navigate(`/purchase-orders/${newOrder.id}`, { replace: true });
    setOrder(newOrder);
    toast({ title: 'PO Created', description: `${newOrder.po_number} created` });
  };

  const handleAddPart = () => {
    if (!selectedPartId || !currentOrder) return;
    const result = poAddLine(currentOrder.id, selectedPartId, parseInt(partQty) || 1);
    if (result.success) {
      toast({ title: 'Part Added' });
      setAddPartOpen(false);
      setSelectedPartId('');
      setPartQty('1');
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleReceive = () => {
    if (!receiveLineId) return;
    const result = poReceive(receiveLineId, parseInt(receiveQty) || 0);
    if (result.success) {
      toast({ title: 'Items Received', description: 'Inventory has been updated' });
      setReceiveLineId(null);
      setReceiveQty('');
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleClose = () => {
    if (!currentOrder) return;
    const result = poClose(currentOrder.id);
    if (result.success) {
      toast({ title: 'PO Closed' });
      setShowCloseDialog(false);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const lines = currentOrder ? getPurchaseOrderLines(currentOrder.id) : [];
  const vendor = vendors.find((v) => v.id === currentOrder?.vendor_id);
  const allReceived = lines.length > 0 && lines.every((l) => l.received_quantity >= l.ordered_quantity);
  const derivedStatus = currentOrder ? getPurchaseOrderDerivedStatus(currentOrder, lines) : 'OPEN';
  const linksLocked = derivedStatus === 'PARTIALLY_RECEIVED' || derivedStatus === 'RECEIVED';

  useEffect(() => {
    setLinkSalesOrderId(currentOrder?.sales_order_id || '');
    setLinkWorkOrderId(currentOrder?.work_order_id || '');
  }, [currentOrder?.sales_order_id, currentOrder?.work_order_id]);

  const getSalesOrderLabel = (id: string) => {
    if (!id) return 'None';
    const so = salesOrders.find((s) => s.id === id);
    if (!so) return 'None';
    const number = so.order_number || so.id;
    const displayNumber = number.startsWith('SO-') ? number : `SO-${number}`;
    return `${displayNumber} (${so.status})`;
  };

  const getWorkOrderLabel = (id: string) => {
    if (!id) return 'None';
    const wo = workOrders.find((w) => w.id === id);
    if (!wo) return 'None';
    const number = wo.order_number || wo.id;
    const displayNumber = number.startsWith('WO-') ? number : `WO-${number}`;
    return `${displayNumber} (${wo.status})`;
  };

  const workOrderOptions = useMemo(() => {
    const query = woQuery.trim().toLowerCase();
    const allowedStatuses = new Set(['ESTIMATE', 'OPEN', 'IN_PROGRESS', 'INVOICED']);
    const statusFilterSet =
      woStatusFilter === 'all'
        ? allowedStatuses
        : woStatusFilter === 'open'
        ? new Set(['OPEN', 'IN_PROGRESS'])
        : new Set([woStatusFilter.toUpperCase()]);
    return workOrders
      .filter((wo) => allowedStatuses.has(wo.status) && wo.is_active !== false)
      .filter((wo) => statusFilterSet.has(wo.status))
      .map((wo) => {
        const number = wo.order_number || wo.id;
        const label = `${number} (${wo.status})`;
        const searchText = label.toLowerCase();
        return { id: wo.id, label, searchText };
      })
      .filter((opt) => (!query ? true : opt.searchText.includes(query)));
  }, [workOrders, woQuery, woStatusFilter]);

  const salesOrderOptions = useMemo(() => {
    const query = soQuery.trim().toLowerCase();
    const allowedStatuses = new Set(['OPEN', 'ESTIMATE', 'INVOICED']);
    const statusFilterSet =
      soStatusFilter === 'all'
        ? allowedStatuses
        : soStatusFilter === 'open'
        ? new Set(['OPEN', 'ESTIMATE'])
        : new Set([soStatusFilter.toUpperCase()]);
    return salesOrders
      .filter((so) => allowedStatuses.has(so.status) && so.is_active !== false)
      .filter((so) => statusFilterSet.has(so.status))
      .map((so) => {
        const number = so.order_number || so.id;
        const label = `${number} (${so.status})`;
        const searchText = label.toLowerCase();
        return { id: so.id, label, searchText };
      })
      .filter((opt) => (!query ? true : opt.searchText.includes(query)));
  }, [salesOrders, soQuery, soStatusFilter]);

  const conflictingSalesOrderPo = useMemo(() => {
    if (!linkSalesOrderId || !currentOrder) return null;
    return purchaseOrders.find((po) => po.id !== currentOrder.id && po.sales_order_id === linkSalesOrderId) || null;
  }, [currentOrder, linkSalesOrderId, purchaseOrders]);

  const conflictingWorkOrderPo = useMemo(() => {
    if (!linkWorkOrderId || !currentOrder) return null;
    return purchaseOrders.find((po) => po.id !== currentOrder.id && po.work_order_id === linkWorkOrderId) || null;
  }, [currentOrder, linkWorkOrderId, purchaseOrders]);

  const isSelectedSalesOrderInvoiced = useMemo(() => {
    if (!linkSalesOrderId) return false;
    const so = salesOrders.find((s) => s.id === linkSalesOrderId);
    return so?.status === 'INVOICED';
  }, [linkSalesOrderId, salesOrders]);

  const isSelectedWorkOrderInvoiced = useMemo(() => {
    if (!linkWorkOrderId) return false;
    const wo = workOrders.find((w) => w.id === linkWorkOrderId);
    return wo?.status === 'INVOICED';
  }, [linkWorkOrderId, workOrders]);

  const linkedSalesOrder = useMemo(() => {
    const idToUse = linkSalesOrderId || currentOrder?.sales_order_id;
    return idToUse ? salesOrders.find((s) => s.id === idToUse) : null;
  }, [currentOrder?.sales_order_id, linkSalesOrderId, salesOrders]);

  const linkedWorkOrder = useMemo(() => {
    const idToUse = linkWorkOrderId || currentOrder?.work_order_id;
    return idToUse ? workOrders.find((w) => w.id === idToUse) : null;
  }, [currentOrder?.work_order_id, linkWorkOrderId, workOrders]);

  const linkedSalesCustomer = linkedSalesOrder ? customers.find((c) => c.id === linkedSalesOrder.customer_id) : null;
  const linkedWorkCustomer = linkedWorkOrder ? customers.find((c) => c.id === linkedWorkOrder.customer_id) : null;
  const linkedWorkUnit = linkedWorkOrder ? units.find((u) => u.id === linkedWorkOrder.unit_id) : null;
  const linkedWorkUnitLabel = useMemo(() => {
    if (!linkedWorkUnit) return '-';
    return (
      linkedWorkUnit.unit_name ||
      [linkedWorkUnit.year, linkedWorkUnit.make, linkedWorkUnit.model].filter(Boolean).join(' ') ||
      linkedWorkUnit.vin ||
      '-'
    );
  }, [linkedWorkUnit]);
  const poReturns = useMemo(
    () => (currentOrder ? getReturnsByPurchaseOrder(currentOrder.id) : []),
    [currentOrder, getReturnsByPurchaseOrder]
  );

  const handleSaveLinks = () => {
    if (!currentOrder) return;
    if (isSelectedSalesOrderInvoiced || isSelectedWorkOrderInvoiced) {
      setShowInvoicedDialog(true);
      return;
    }
    if (conflictingSalesOrderPo || conflictingWorkOrderPo) {
      setShowLinkConflictDialog(true);
      return;
    }
    performSaveLinks();
  };

  const handleCreateReturnForPo = () => {
    if (!currentOrder?.vendor_id) {
      toast({ title: 'Vendor required', description: 'Cannot create a return without a vendor.', variant: 'destructive' });
      return;
    }
    const ret = createReturn({
      vendor_id: currentOrder.vendor_id,
      purchase_order_id: currentOrder.id,
    });
    if (ret) {
      navigate(`/returns/${ret.id}`);
    }
  };

  const performSaveLinks = () => {
    if (!currentOrder) return;
    updatePurchaseOrderLinks(currentOrder.id, {
      sales_order_id: linkSalesOrderId || null,
      work_order_id: linkWorkOrderId || null,
    });
    toast({ title: 'Links Updated', description: 'Purchase order links saved' });
  };

  if (isNew && !order) {
    return (
      <div className="page-container">
        <PageHeader title="New Purchase Order" backTo="/purchase-orders" />
        <div className="form-section max-w-xl">
          <div className="space-y-4">
            <div>
              <Label>Vendor *</Label>
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {activeVendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.vendor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Create PO
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title={currentOrder?.po_number || 'Purchase Order'}
        subtitle={isClosed ? 'Closed' : derivedStatus === 'PARTIALLY_RECEIVED' ? 'Partially Received' : 'Open'}
        backTo="/purchase-orders"
        actions={
          !isClosed && (
            <>
              <Button size="sm" onClick={() => setAddPartOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Part
              </Button>
              {allReceived && (
                <Button onClick={() => setShowCloseDialog(true)}>
                  <Lock className="w-4 h-4 mr-2" />
                  Close PO
                </Button>
              )}
            </>
          )
        }
      />

      <div className="form-section mb-6 space-y-4 overflow-hidden w-full max-w-full">
        <p className="text-sm text-muted-foreground">
          Vendor:{' '}
          <span className="font-medium text-foreground">
            {vendor?.vendor_name}
          </span>
        </p>
        {currentOrder && (
          <div className="space-y-3">
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 min-h-[24px]">
                  <span className="text-sm text-muted-foreground min-w-0">Linked Sales Order</span>
                  {currentOrder.sales_order_id ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="link" size="sm">
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Sales Order Preview</DialogTitle>
                          <DialogDescription className="space-y-1">
                            <p className="font-medium text-foreground">{linkedSalesOrder?.order_number || linkedSalesOrder?.id}</p>
                            <StatusBadge status={linkedSalesOrder?.status || 'OPEN'} />
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Customer</span>
                            <span className="font-medium">{linkedSalesCustomer?.company_name || '-'}</span>
                          </div>
                        </div>
                        <ModalFooter>
                          <DialogClose asChild>
                            <Button variant="ghost">Close</Button>
                          </DialogClose>
                          <Button
                            onClick={() => navigate(`/sales-orders/${currentOrder.sales_order_id}`)}
                          >
                            Open Sales Order
                          </Button>
                        </ModalFooter>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <span className="text-xs text-muted-foreground opacity-70">None</span>
                  )}
                </div>
                <Popover open={openSalesOrderPicker} onOpenChange={setOpenSalesOrderPicker}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openSalesOrderPicker}
                      className="w-full justify-between h-9"
                      disabled={linksLocked}
                    >
                      {getSalesOrderLabel(linkSalesOrderId)}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-72">
                    <div className="border-b p-2 flex flex-wrap items-center gap-2 max-w-full">
                      {(['all', 'open', 'estimate', 'invoiced'] as const).map((filter) => (
                        <Button
                          key={filter}
                          size="sm"
                          variant={soStatusFilter === filter ? 'default' : 'outline'}
                          onClick={() => setSoStatusFilter(filter)}
                          className="shrink-0"
                        >
                          {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </Button>
                      ))}
                    </div>
                    <Command>
                      <CommandInput
                        placeholder="Search sales orders..."
                        value={soQuery}
                        onValueChange={setSoQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No sales orders found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__NONE__"
                            onSelect={(value) => {
                              setLinkSalesOrderId(value === '__NONE__' ? '' : value);
                              setOpenSalesOrderPicker(false);
                            }}
                          >
                            None
                          </CommandItem>
                          {salesOrderOptions.map((so) => {
                            return (
                              <CommandItem
                                key={so.id}
                                value={so.searchText}
                                onSelect={() => {
                                  setLinkSalesOrderId(so.id);
                                  setOpenSalesOrderPicker(false);
                                }}
                              >
                                {so.label}
                              </CommandItem>
                            );
                          })}
                          {salesOrderOptions.length === 0 && (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">No results</div>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {conflictingSalesOrderPo && (
                  <p className="text-sm text-destructive">
                    This sales order is already linked to PO {conflictingSalesOrderPo.po_number || conflictingSalesOrderPo.id}.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2 min-h-[24px]">
                  <span className="text-sm text-muted-foreground min-w-0">Linked Work Order</span>
                  {currentOrder.work_order_id ? (
                    <Dialog open={openWorkOrderPreview} onOpenChange={setOpenWorkOrderPreview}>
                      <DialogTrigger asChild>
                        <Button variant="link" size="sm">
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Work Order Preview</DialogTitle>
                          <DialogDescription className="space-y-1">
                            <p className="font-medium text-foreground">{linkedWorkOrder?.order_number || linkedWorkOrder?.id}</p>
                            <StatusBadge status={linkedWorkOrder?.status || 'OPEN'} />
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Customer</span>
                            <span className="font-medium">{linkedWorkCustomer?.company_name || '-'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Unit</span>
                            <span className="font-medium">{linkedWorkUnitLabel}</span>
                          </div>
                        </div>
                        <ModalFooter>
                          <DialogClose asChild>
                            <Button variant="ghost">Close</Button>
                          </DialogClose>
                          <Button
                            onClick={() => {
                              if (linkedWorkOrder?.id) {
                                navigate(`/work-orders/${linkedWorkOrder.id}`);
                                setOpenWorkOrderPreview(false);
                              }
                            }}
                          >
                            Open Work Order
                          </Button>
                        </ModalFooter>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <span className="text-xs text-muted-foreground opacity-70">None</span>
                  )}
                </div>
                <Popover open={openWorkOrderPicker} onOpenChange={setOpenWorkOrderPicker}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openWorkOrderPicker}
                      className="w-full justify-between h-9"
                      disabled={linksLocked}
                    >
                      {getWorkOrderLabel(linkWorkOrderId)}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-72">
                    <div className="border-b p-2 flex flex-wrap items-center gap-2 max-w-full">
                      {(['all', 'open', 'estimate', 'invoiced'] as const).map((filter) => (
                        <Button
                          key={filter}
                          size="sm"
                          variant={woStatusFilter === filter ? 'default' : 'outline'}
                          onClick={() => setWoStatusFilter(filter)}
                          className="shrink-0"
                        >
                          {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </Button>
                      ))}
                    </div>
                    <Command>
                      <CommandInput
                        placeholder="Search work orders..."
                        value={woQuery}
                        onValueChange={setWoQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No work orders found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__NONE__"
                            onSelect={(value) => {
                              setLinkWorkOrderId(value === '__NONE__' ? '' : value);
                              setOpenWorkOrderPicker(false);
                            }}
                          >
                            None
                          </CommandItem>
                          {workOrderOptions.map((wo) => {
                            return (
                              <CommandItem
                                key={wo.id}
                                value={wo.searchText}
                                onSelect={() => {
                                  setLinkWorkOrderId(wo.id);
                                  setOpenWorkOrderPicker(false);
                                }}
                              >
                                {wo.label}
                              </CommandItem>
                            );
                          })}
                          {workOrderOptions.length === 0 && (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">No results</div>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {conflictingWorkOrderPo && (
                  <p className="text-sm text-destructive">
                    This work order is already linked to PO {conflictingWorkOrderPo.po_number || conflictingWorkOrderPo.id}.
                  </p>
                )}
              </div>
            </div>
            <div className="flex w-full max-w-full flex-wrap items-center gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveLinks}
                className="shrink-0"
                disabled={linksLocked}
              >
                Save Links
              </Button>
            </div>
            {linksLocked && (
              <p className="text-xs text-muted-foreground">
                Links can’t be changed once a PO is partially received or received.
              </p>
            )}
          </div>
        )}

        {currentOrder && (
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Returns</h3>
              <Button size="sm" variant="outline" onClick={handleCreateReturnForPo}>
                Create Return for this PO
              </Button>
            </div>
            {poReturns.length === 0 ? (
              <p className="text-xs text-muted-foreground">No returns linked to this PO.</p>
            ) : (
              <div className="space-y-2">
                {poReturns.map((ret) => (
                  <div key={ret.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{ret.rma_number || ret.id}</span>
                      <StatusBadge status={ret.status} />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/returns/${ret.id}`)}>
                      Open
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={showInvoicedDialog} onOpenChange={setShowInvoicedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Linking to an Invoiced Order</AlertDialogTitle>
            <AlertDialogDescription>
              You’re about to link this Purchase Order to an invoiced Sales/Work Order. This is allowed, but double-check it’s intentional.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowInvoicedDialog(false);
                if (conflictingSalesOrderPo || conflictingWorkOrderPo) {
                  setShowLinkConflictDialog(true);
                  return;
                }
                performSaveLinks();
              }}
            >
              Link Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLinkConflictDialog} onOpenChange={setShowLinkConflictDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Link Overrides</AlertDialogTitle>
            <AlertDialogDescription>
              The selected order(s) are already linked to another purchase order. Saving will override those links.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            {conflictingSalesOrderPo && (
              <p className="text-sm">
                Sales Order currently linked to PO {conflictingSalesOrderPo.po_number || conflictingSalesOrderPo.id}.
              </p>
            )}
            {conflictingWorkOrderPo && (
              <p className="text-sm">
                Work Order currently linked to PO {conflictingWorkOrderPo.po_number || conflictingWorkOrderPo.id}.
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowLinkConflictDialog(false);
                performSaveLinks();
              }}
            >
              Save Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="table-container">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part #</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Ordered</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              {!isClosed && <TableHead className="w-32">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No parts added
                </TableCell>
              </TableRow>
            ) : (
              lines.map((line) => {
                const part = parts.find((p) => p.id === line.part_id);
                const remaining = line.ordered_quantity - line.received_quantity;
                return (
                  <TableRow key={line.id}>
                    <TableCell className="font-mono">{part?.part_number}</TableCell>
                    <TableCell>{part?.description || '-'}</TableCell>
                    <TableCell className="text-right">{line.ordered_quantity}</TableCell>
                    <TableCell className="text-right">{line.received_quantity}</TableCell>
                    <TableCell className="text-right">${line.unit_cost.toFixed(2)}</TableCell>
                    {!isClosed && (
                      <TableCell>
                        <div className="flex gap-2">
                          {remaining > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReceiveLineId(line.id);
                                setReceiveQty(String(remaining));
                              }}
                            >
                              <PackageCheck className="w-3 h-3 mr-1" />
                              Receive
                            </Button>
                          )}
                          {line.received_quantity === 0 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => poRemoveLine(line.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Part Dialog */}
      <QuickAddDialog
        open={addPartOpen}
        onOpenChange={setAddPartOpen}
        title="Add Part to PO"
        onSave={handleAddPart}
        onCancel={() => setAddPartOpen(false)}
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
                    {p.part_number} - {p.description}
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

      {/* Receive Dialog */}
      <QuickAddDialog
        open={!!receiveLineId}
        onOpenChange={(o) => !o && setReceiveLineId(null)}
        title="Receive Items"
        onSave={handleReceive}
        onCancel={() => setReceiveLineId(null)}
      >
        <div>
          <Label>Quantity to Receive</Label>
          <Input
            type="number"
            min="1"
            value={receiveQty}
            onChange={(e) => setReceiveQty(e.target.value)}
          />
        </div>
      </QuickAddDialog>

      {/* Close PO Dialog */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Purchase Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently lock the PO. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose}>Close PO</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
