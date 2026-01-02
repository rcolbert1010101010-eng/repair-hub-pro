import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useShopStore } from '@/stores/shopStore';
import { useToast } from '@/hooks/use-toast';
import { Save, Plus, Trash2, FileCheck, Printer, Edit, X, Clock, Square, Shield, RotateCcw, Check, Pencil, X as XIcon, Info } from 'lucide-react';
import { QuickAddDialog } from '@/components/ui/quick-add-dialog';
import { PrintWorkOrder, PrintWorkOrderPickList } from '@/components/print/PrintInvoice';
import { calcPartPriceForLevel } from '@/domain/pricing/partPricing';
import { getPurchaseOrderDerivedStatus } from '@/services/purchaseOrderStatus';
import { StatusBadge } from '@/components/ui/status-badge';
import { PurchaseOrderPreviewDialog } from '@/components/purchase-orders/PurchaseOrderPreviewDialog';
import { useRepos } from '@/repos';
import { summarizeFabJob } from '@/services/fabJobSummary';
import type { FabJobLine, PlasmaJobLine } from '@/types';

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
    vendors,
    categories,
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
    purchaseOrders,
    purchaseOrderLines,
    warrantyClaims,
    createWarrantyClaim,
    getClaimsByWorkOrder,
  } = useShopStore();
  const { toast } = useToast();
  const repos = useRepos();
  const fabricationRepo = repos.fabrication;
  const plasmaRepo = repos.plasma;
  const workOrderRepo = repos.workOrders;

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
  const [newPartDialogOpen, setNewPartDialogOpen] = useState(false);
  const [newPartData, setNewPartData] = useState({
    part_number: '',
    description: '',
    vendor_id: '',
    category_id: '',
    cost: '',
    selling_price: '',
  });
  const [editingPriceLineId, setEditingPriceLineId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState<string>('');
  const [printMode, setPrintMode] = useState<'invoice' | 'picklist'>('invoice');
  const [sheetPrintMode, setSheetPrintMode] = useState<'NONE' | 'OVERVIEW' | 'TECH'>('NONE');

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
  const [createClaimOpen, setCreateClaimOpen] = useState(false);
  const [selectedClaimVendor, setSelectedClaimVendor] = useState('');
  const [fabWarnings, setFabWarnings] = useState<string[]>([]);
  const [plasmaWarnings, setPlasmaWarnings] = useState<string[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const currentOrder = workOrders.find((o) => o.id === id) || order;
  useEffect(() => {
    if (currentOrder) {
      plasmaRepo.createForWorkOrder(currentOrder.id);
      fabricationRepo.createForWorkOrder(currentOrder.id);
    }
  }, [currentOrder, fabricationRepo, plasmaRepo]);
  const activeCustomers = customers.filter((c) => c.is_active && c.id !== 'walkin');
  const customerUnits = useMemo(() => {
    const custId = selectedCustomerId || currentOrder?.customer_id;
    if (!custId) return [];
    return units.filter((u) => u.customer_id === custId && u.is_active);
  }, [selectedCustomerId, currentOrder?.customer_id, units]);
  const activeParts = parts.filter((p) => p.is_active);
  const activeTechnicians = technicians.filter((t) => t.is_active);
  const activeVendors = vendors.filter((v) => v.is_active);
  const activeCategories = categories.filter((c) => c.is_active);

  const isInvoiced = currentOrder?.status === 'INVOICED';
  const isEstimate = currentOrder?.status === 'ESTIMATE';
  const workOrderClaims = useMemo(
    () => (currentOrder ? getClaimsByWorkOrder(currentOrder.id) : []),
    [currentOrder, getClaimsByWorkOrder]
  );
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
      .filter((po) => po.work_order_id === currentOrder.id)
      .map((po) => ({
        ...po,
        derivedStatus: getPurchaseOrderDerivedStatus(po, poLinesByPo[po.id] || []),
      }));
  }, [currentOrder, poLinesByPo, purchaseOrders]);

  const chargeLines = currentOrder ? workOrderRepo.getWorkOrderChargeLines(currentOrder.id) : [];
  const fabData = currentOrder ? fabricationRepo.getByWorkOrder(currentOrder.id) : null;
  const fabJob = fabData?.job;
  const fabLines = fabData?.lines ?? [];
  const fabChargeLine = chargeLines.find(
    (line) => line.source_ref_type === 'FAB_JOB' && line.source_ref_id === fabJob?.id
  );
  const fabLocked = isInvoiced;
  const fabSummary = useMemo(() => summarizeFabJob(fabLines), [fabLines]);
  const fabTotal = fabSummary.total_sell;
  const [showFabValidation, setShowFabValidation] = useState(false);
  useEffect(() => {
    setFabWarnings(fabJob?.warnings ?? []);
  }, [fabJob?.warnings]);
  const formattedFabWarnings = useMemo(() => {
    if (!showFabValidation) return [];
    const counters: Record<string, number> = {};
    const missingFromLines = fabLines
      .map((line) => {
        const info = getFabMissingInfo(line);
        const typeKey = line.operation_type;
        const typeLabel = typeKey === 'PRESS_BRAKE' ? 'Press Brake' : typeKey === 'WELD' ? 'Weld' : 'Fabrication';
        counters[typeKey] = (counters[typeKey] || 0) + 1;
        const lineNumber = counters[typeKey];
        if (info.missingFields.length === 0 || info.validOverridePath) return null;
        return {
          typeLabel,
          lineNumber,
          message: `needs: ${info.missingFields.join(', ')}`,
          key: `${typeKey}-${lineNumber}-${info.missingFields.join('-')}`,
        };
      })
      .filter(Boolean) as { typeLabel: string; lineNumber: number; message: string; key: string }[];

    if (missingFromLines.length > 0) return missingFromLines;

    const countersFallback: Record<string, number> = {};
    return fabWarnings.map((warning) => {
      const cleaned = warning.replace(/^Line\\s+[^:]+:\\s*/i, '').trim();
      const [rawType, ...rest] = cleaned.split(':');
      const typeKey = rawType?.trim().toUpperCase() || '';
      const typeLabel = typeKey === 'PRESS_BRAKE' ? 'Press Brake' : typeKey === 'WELD' ? 'Weld' : 'Fabrication';
      countersFallback[typeKey] = (countersFallback[typeKey] || 0) + 1;
      const lineNumber = countersFallback[typeKey];
      const bodyWithoutPrefix = rest.join(':').trim().replace(/^line\\s+\\d+\\s*/i, '');
      return {
        typeLabel,
        lineNumber,
        message: bodyWithoutPrefix || cleaned,
        key: `${typeKey}-${lineNumber}-${bodyWithoutPrefix}`,
      };
    });
  }, [fabLines, fabWarnings, showFabValidation]);
  const plasmaData = currentOrder ? plasmaRepo.getByWorkOrder(currentOrder.id) : null;
  const plasmaJob = plasmaData?.job;
  const plasmaLines = plasmaData?.lines ?? [];
  const plasmaTotal = plasmaLines.reduce((sum, line) => sum + (line.sell_price_total ?? 0), 0);
  const plasmaChargeLine = chargeLines.find(
    (line) => line.source_ref_type === 'PLASMA_JOB' && line.source_ref_id === plasmaJob?.id
  );
  const plasmaTemplateOptions = useMemo(() => plasmaRepo.templates.list(), [plasmaRepo]);
  const plasmaLocked =
    isInvoiced || (plasmaJob ? plasmaJob.status !== 'DRAFT' && plasmaJob.status !== 'QUOTED' : false);
  const plasmaAttachments = plasmaJob ? plasmaRepo.attachments.list(plasmaJob.id) : [];
  const [dxfAssistOpen, setDxfAssistOpen] = useState(false);

  // Time tracking data
  const timeEntries = currentOrder ? getTimeEntriesByWorkOrder(currentOrder.id) : [];
  const totalMinutes = timeEntries.reduce((sum, te) => sum + te.total_minutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(2);
  useEffect(() => {
    if (!currentOrder) return;
    const hasContent =
      isInvoiced ||
      chargeLines.length > 0 ||
      partLines.length > 0 ||
      laborLines.length > 0 ||
      fabLines.length > 0 ||
      plasmaLines.length > 0 ||
      !!fabJob?.posted_at ||
      !!plasmaJob?.posted_at;
    setActiveTab(hasContent ? 'overview' : 'parts');
  }, [currentOrder?.id]);

  if (!isNew && !currentOrder) {
    return (
      <div className="page-container">
        <style>{printStyles}</style>
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

  function getFabMissingInfo(line: FabJobLine) {
    const missingFields: string[] = [];
    const validOverridePath =
      (!!line.override_machine_minutes && (line.machine_minutes ?? 0) > 0) ||
      (!!line.override_labor_cost && (line.labor_cost ?? 0) > 0) ||
      (!!line.override_consumables_cost && (line.consumables_cost ?? 0) > 0);
    if (!validOverridePath) {
      if (line.operation_type === 'PRESS_BRAKE') {
        if (line.bends_count == null) missingFields.push('bends count');
        if (line.bend_length == null) missingFields.push('bend length (in)');
      } else {
        if (line.weld_length == null) missingFields.push('weld length (in)');
        if (!line.weld_process) missingFields.push('weld process');
      }
    }
    return { missingFields, validOverridePath };
  }

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

  const handleAddFabLine = () => {
    if (!currentOrder || fabLocked) return;
    const job = fabricationRepo.createForWorkOrder(currentOrder.id);
    fabricationRepo.upsertLine(job.id, { operation_type: 'PRESS_BRAKE', qty: 1 });
  };

  const handleFabNumberChange = (
    lineId: string,
    field: keyof Pick<
      FabJobLine,
      'qty' | 'thickness' | 'bends_count' | 'bend_length' | 'setup_minutes' | 'machine_minutes' | 'tonnage_estimate' | 'weld_length' | 'consumables_cost' | 'labor_cost'
    >,
    value: string
  ) => {
    if (!fabJob || fabLocked) return;
    const numeric = value === '' ? null : parseFloat(value);
    const safeValue = numeric != null && !Number.isNaN(numeric) ? numeric : null;
    fabricationRepo.upsertLine(fabJob.id, { id: lineId, [field]: safeValue } as Partial<FabJobLine>);
  };

  const handleFabTextChange = (
    lineId: string,
    field: keyof Pick<FabJobLine, 'material_type' | 'description' | 'notes' | 'tooling' | 'position'>,
    value: string
  ) => {
    if (!fabJob || fabLocked) return;
    fabricationRepo.upsertLine(fabJob.id, { id: lineId, [field]: value || null } as Partial<FabJobLine>);
  };

  const handleFabOperationChange = (lineId: string, operation: 'PRESS_BRAKE' | 'WELD') => {
    if (!fabJob || fabLocked) return;
    fabricationRepo.upsertLine(fabJob.id, { id: lineId, operation_type: operation });
  };

  const handleFabWeldProcessChange = (lineId: string, process: FabJobLine['weld_process']) => {
    if (!fabJob || fabLocked) return;
    fabricationRepo.upsertLine(fabJob.id, { id: lineId, weld_process: process ?? null });
  };

  const handleFabWeldTypeChange = (lineId: string, weldType: FabJobLine['weld_type']) => {
    if (!fabJob || fabLocked) return;
    fabricationRepo.upsertLine(fabJob.id, { id: lineId, weld_type: weldType ?? null });
  };

  const handleFabToggleOverride = (
    lineId: string,
    field: keyof Pick<FabJobLine, 'override_machine_minutes' | 'override_consumables_cost' | 'override_labor_cost'>,
    checked: boolean
  ) => {
    if (!fabJob || fabLocked) return;
    fabricationRepo.upsertLine(fabJob.id, { id: lineId, [field]: checked } as Partial<FabJobLine>);
  };

  const handleDeleteFabLine = (lineId: string) => {
    if (fabLocked) return;
    fabricationRepo.deleteLine(lineId);
  };

  const handleRecalculateFabJob = () => {
    if (!fabJob) return;
    setShowFabValidation(true);
    const result = fabricationRepo.recalculate(fabJob.id);
    if (!result.success) {
      toast({ title: 'Recalculate failed', description: result.error, variant: 'destructive' });
    } else {
      setFabWarnings(result.warnings ?? []);
      toast({ title: 'Fabrication pricing updated' });
    }
  };

  const handlePostFabJob = () => {
    if (!fabJob || fabLocked) return;
    setShowFabValidation(true);
    const recalcResult = fabricationRepo.recalculate(fabJob.id);
    if (recalcResult?.warnings) {
      setFabWarnings(recalcResult.warnings);
    }
    const refreshedFab = currentOrder ? fabricationRepo.getByWorkOrder(currentOrder.id) : fabData;
    const blockingLine = refreshedFab?.lines.find((line) => {
      const info = getFabMissingInfo(line);
      return info.missingFields.length > 0 && !info.validOverridePath;
    });
    if (blockingLine) {
      toast({ title: 'Missing inputs', description: 'Add required fabrication inputs before posting.', variant: 'destructive' });
      return;
    }
    const result = fabricationRepo.postToWorkOrder(fabJob.id);
    if (!result.success) {
      toast({ title: 'Post failed', description: result.error, variant: 'destructive' });
      return;
    }
    toast({ title: 'Fabrication posted to work order' });
  };

  const handleAddPlasmaLine = () => {
    if (!plasmaJob || plasmaLocked) return;
    plasmaRepo.upsertLine(plasmaJob.id, {
      qty: 1,
      material_type: '',
      thickness: null,
      cut_length: 0,
      pierce_count: 0,
      setup_minutes: 0,
      machine_minutes: 0,
    });
  };

  const handlePlasmaNumberChange = (
    lineId: string,
    field: keyof Pick<PlasmaJobLine, 'qty' | 'cut_length' | 'pierce_count' | 'thickness' | 'setup_minutes' | 'machine_minutes'>,
    value: string
  ) => {
    if (!plasmaJob || plasmaLocked) return;
    const numeric = value === '' ? 0 : parseFloat(value);
    const safeValue = Number.isNaN(numeric) ? 0 : numeric;
    plasmaRepo.upsertLine(plasmaJob.id, { id: lineId, [field]: safeValue } as Partial<PlasmaJobLine>);
  };

  const handlePlasmaTextChange = (lineId: string, value: string) => {
    if (!plasmaJob || plasmaLocked) return;
    plasmaRepo.upsertLine(plasmaJob.id, { id: lineId, material_type: value });
  };

  const handlePlasmaSellPriceChange = (lineId: string, value: string) => {
    if (!plasmaJob || plasmaLocked) return;
    const numeric = value === '' ? 0 : parseFloat(value);
    const safeValue = Number.isNaN(numeric) ? 0 : numeric;
    const existing = plasmaLines.find((l) => l.id === lineId);
    const overrides = { ...(existing?.overrides || {}), sell_price_each: safeValue };
    plasmaRepo.upsertLine(plasmaJob.id, { id: lineId, overrides });
  };

  const handleDeletePlasmaLine = (lineId: string) => {
    if (plasmaLocked) return;
    plasmaRepo.deleteLine(lineId);
  };

  const handleRecalculatePlasmaJob = () => {
    if (!plasmaJob) return;
    const result = plasmaRepo.recalc(plasmaJob.id);
    if (!result.success) {
      toast({ title: 'Recalculate failed', description: result.error, variant: 'destructive' });
    } else {
      setPlasmaWarnings(result.warnings?.map((w) => w.message) ?? []);
      toast({ title: 'Plasma pricing updated' });
    }
  };

  const handlePostPlasmaJob = () => {
    if (!plasmaJob || plasmaLocked) return;
    const result = plasmaRepo.postToWorkOrder(plasmaJob.id);
    if (result.success) {
      toast({ title: 'Posted to Work Order', description: 'Charge line updated' });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleAttachmentUpload = (file?: File) => {
    if (!file || !plasmaJob) return;
    const result = plasmaRepo.attachments.add(plasmaJob.id, file);
    if (!result.success) {
      toast({ title: 'Upload failed', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Attachment added' });
    }
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    if (!confirm('Remove this attachment?')) return;
    plasmaRepo.attachments.remove(attachmentId);
  };

  const handleAttachmentNoteChange = (attachmentId: string, notes: string) => {
    plasmaRepo.attachments.update(attachmentId, { notes });
  };

  const customer = customers.find((c) => c.id === (currentOrder?.customer_id || selectedCustomerId));
  const unit = units.find((u) => u.id === (currentOrder?.unit_id || selectedUnitId));
  const allPartLines = currentOrder ? getWorkOrderPartLines(currentOrder.id) : [];
  const laborLines = currentOrder ? getWorkOrderLaborLines(currentOrder.id) : [];
  const otherChargeLines = chargeLines.filter((line) => line.source_ref_type !== 'PLASMA_JOB' && line.source_ref_type !== 'FAB_JOB');
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
  const partsSubtotal = partLines.reduce((sum, line) => sum + line.line_total, 0);
  const laborSubtotal = laborLines.reduce((sum, line) => sum + line.line_total, 0);
  const otherCharges = otherChargeLines.reduce((sum, line) => sum + line.total_price, 0);
  const fabricationTotal = fabTotal;
  const overviewGrandTotal = partsSubtotal + laborSubtotal + fabricationTotal + plasmaTotal + otherCharges;
  const [activeTab, setActiveTab] = useState<'overview' | 'parts' | 'labor' | 'fabrication' | 'plasma' | 'time'>('parts');
  const printStyles = `
    @media print {
      aside,
      [data-sidebar],
      .sidebar,
      .layout-sidebar,
      .vertical-nav {
        display: none !important;
      }
      [role="tablist"],
      button,
      input,
      select,
      textarea,
      .print\\:hidden,
      .print-hidden {
        display: none !important;
      }
      #wo-overview-print {
        display: block !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      #wo-tech-print {
        display: none !important;
      }
      body[data-print-mode="OVERVIEW"] * {
        visibility: hidden !important;
      }
      body[data-print-mode="OVERVIEW"] #wo-overview-print,
      body[data-print-mode="OVERVIEW"] #wo-overview-print * {
        visibility: visible !important;
      }
      body[data-print-mode="OVERVIEW"] #wo-overview-print {
        display: block !important;
      }
      body[data-print-mode="TECH"] * {
        visibility: hidden !important;
      }
      body[data-print-mode="TECH"] #wo-tech-print,
      body[data-print-mode="TECH"] #wo-tech-print * {
        visibility: visible !important;
      }
      body[data-print-mode="TECH"] #wo-tech-print {
        display: block !important;
      }
      body[data-print-mode="OVERVIEW"] #wo-overview-print,
      body[data-print-mode="TECH"] #wo-tech-print {
        position: absolute;
        left: 0;
        top: 0;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      body[data-print-mode="TECH"] input {
        display: inline-block !important;
      }
    }
  `;
  useEffect(() => {
    if (sheetPrintMode && sheetPrintMode !== 'NONE') {
      document.body.setAttribute('data-print-mode', sheetPrintMode);
    } else {
      document.body.removeAttribute('data-print-mode');
    }
    return () => {
      document.body.removeAttribute('data-print-mode');
    };
  }, [sheetPrintMode]);

  // New order form
  if (isNew && !order) {
    return (
      <div className="page-container">
        <style>{printStyles}</style>
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
      <style>{printStyles}</style>
      <PageHeader
        title={currentOrder?.order_number || 'Work Order'}
        subtitle={
          currentOrder?.status === 'ESTIMATE'
            ? 'Estimate'
            : currentOrder?.status === 'INVOICED'
            ? 'Invoiced'
            : currentOrder?.status === 'IN_PROGRESS'
            ? 'In Progress'
            : 'Open'
        }
        backTo="/work-orders"
        actions={
          !isInvoiced ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setSheetPrintMode('TECH');
                  requestAnimationFrame(() => {
                    window.print();
                    setSheetPrintMode('NONE');
                  });
                }}
              >
                <Printer className="w-4 h-4 mr-2" />
                Tech Print
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
              {isEstimate ? (
                <Button
                  variant="default"
                  onClick={() => {
                    const result = woConvertToOpen(currentOrder.id);
                    if (!result.success) {
                      toast({ title: 'Error', description: result.error, variant: 'destructive' });
                    } else {
                      toast({ title: 'Converted', description: 'Estimate converted to work order' });
                    }
                  }}
                >
                  Convert to Work Order
                </Button>
              ) : (
                <Button onClick={() => setShowInvoiceDialog(true)}>
                  <FileCheck className="w-4 h-4 mr-2" />
                  Invoice
                </Button>
              )}
            </>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSheetPrintMode('TECH');
                  requestAnimationFrame(() => {
                    window.print();
                    setSheetPrintMode('NONE');
                  });
                }}
              >
                <Printer className="w-4 h-4 mr-2" />
                Tech Print
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
            </div>
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
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as typeof activeTab)} className="w-full">
            <TabsList className="mb-4 print:hidden">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="parts">Parts ({partLines.length})</TabsTrigger>
              <TabsTrigger value="labor">Labor ({laborLines.length})</TabsTrigger>
              <TabsTrigger value="fabrication">Fabrication ({fabLines.length})</TabsTrigger>
              <TabsTrigger value="plasma">Plasma ({plasmaLines.length})</TabsTrigger>
              {timeEntries.length > 0 && <TabsTrigger value="time">Time ({timeEntries.length})</TabsTrigger>}
            </TabsList>

            <TabsContent value="overview">
              <div className="flex justify-end mb-4 print:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSheetPrintMode('OVERVIEW');
                    requestAnimationFrame(() => {
                      window.print();
                      setSheetPrintMode('NONE');
                    });
                  }}
                  className="print:hidden"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Overview
                </Button>
              </div>
              <div id="wo-overview-print">
                <div className="grid gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="border rounded-lg p-4 bg-muted/50 sm:col-span-2 lg:col-span-1">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      Grand Total
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="inline-flex items-center text-muted-foreground hover:text-foreground">
                          <Info className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Sum of parts, labor, fabrication, plasma, and other charges</TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-2xl font-bold">${overviewGrandTotal.toFixed(2)}</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    Parts Subtotal
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="inline-flex items-center text-muted-foreground hover:text-foreground">
                          <Info className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{partLines.length} part lines, sum of line totals</TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-lg font-semibold">${partsSubtotal.toFixed(2)}</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    Labor Subtotal
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="inline-flex items-center text-muted-foreground hover:text-foreground">
                          <Info className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {laborLines.length} labor lines{laborLines.length ? ` · ${totalHours} hrs tracked` : ''}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-lg font-semibold">${laborSubtotal.toFixed(2)}</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    Fabrication Total
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="inline-flex items-center text-muted-foreground hover:text-foreground">
                          <Info className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {fabLines.length} fabrication lines · derived from fabrication sell totals (recalc updates)
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-lg font-semibold">${fabricationTotal.toFixed(2)}</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    Plasma Total
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="inline-flex items-center text-muted-foreground hover:text-foreground">
                          <Info className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {plasmaLines.length} plasma lines · derived from plasma sell totals (recalc updates)
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-lg font-semibold">${plasmaTotal.toFixed(2)}</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    Other Charges
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="inline-flex items-center text-muted-foreground hover:text-foreground">
                          <Info className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{otherChargeLines.length} other charge lines included</TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="text-lg font-semibold">${otherCharges.toFixed(2)}</div>
                </div>
              </div>

                <div className="space-y-6">
                  <div className="border rounded-lg">
                  <div className="px-4 py-3 border-b">
                    <h4 className="font-medium">Parts</h4>
                  </div>
                  <div className="table-container p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Part #</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {partLines.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-6">No parts</TableCell>
                          </TableRow>
                        ) : (
                          partLines.map((line) => {
                            const part = parts.find((p) => p.id === line.part_id);
                            return (
                              <TableRow key={line.id}>
                                <TableCell className="font-mono">{part?.part_number || '-'}</TableCell>
                                <TableCell>{part?.description || line.description || '-'}</TableCell>
                                <TableCell className="text-right">{line.quantity}</TableCell>
                                <TableCell className="text-right">${line.unit_price.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-medium">${line.line_total.toFixed(2)}</TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="border rounded-lg">
                  <div className="px-4 py-3 border-b">
                    <h4 className="font-medium">Labor</h4>
                  </div>
                  <div className="table-container p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Technician</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {laborLines.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-6">No labor</TableCell>
                          </TableRow>
                        ) : (
                          laborLines.map((line) => {
                            const tech = technicians.find((t) => t.id === line.technician_id);
                            return (
                              <TableRow key={line.id}>
                                <TableCell>{line.description}</TableCell>
                                <TableCell>{tech?.name || '-'}</TableCell>
                                <TableCell className="text-right">{line.hours}</TableCell>
                                <TableCell className="text-right">${line.rate.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-medium">${line.line_total.toFixed(2)}</TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="border rounded-lg">
                  <div className="px-4 py-3 border-b">
                    <h4 className="font-medium">Fabrication</h4>
                  </div>
                  <div className="table-container p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Operation</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Machine (min)</TableHead>
                          <TableHead className="text-right">Sell Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fabLines.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-6">No fabrication lines</TableCell>
                          </TableRow>
                        ) : (
                          fabLines.map((line) => (
                            <TableRow key={line.id}>
                              <TableCell>{line.operation_type === 'PRESS_BRAKE' ? 'Press Brake' : 'Weld'}</TableCell>
                              <TableCell>{line.description || '-'}</TableCell>
                              <TableCell className="text-right">{line.qty}</TableCell>
                              <TableCell className="text-right">{line.machine_minutes ?? 0}</TableCell>
                              <TableCell className="text-right font-medium">${(line.sell_price_total ?? 0).toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="border rounded-lg">
                  <div className="px-4 py-3 border-b">
                    <h4 className="font-medium">Plasma</h4>
                  </div>
                  <div className="table-container p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead className="text-right">Thickness</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Machine (min)</TableHead>
                          <TableHead className="text-right">Sell Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plasmaLines.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-6">No plasma lines</TableCell>
                          </TableRow>
                        ) : (
                          plasmaLines.map((line) => (
                            <TableRow key={line.id}>
                              <TableCell>{line.material_type || '-'}</TableCell>
                              <TableCell className="text-right">{line.thickness ?? '-'}</TableCell>
                              <TableCell className="text-right">{line.qty}</TableCell>
                              <TableCell className="text-right">{line.machine_minutes ?? 0}</TableCell>
                              <TableCell className="text-right font-medium">${(line.sell_price_total ?? 0).toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="border rounded-lg">
                  <div className="px-4 py-3 border-b">
                    <h4 className="font-medium">Other Charges</h4>
                  </div>
                  <div className="table-container p-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {chargeLines.filter((c) => c.source_ref_type !== 'PLASMA_JOB' && c.source_ref_type !== 'FAB_JOB').length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-6">No other charges</TableCell>
                          </TableRow>
                        ) : (
                          chargeLines
                            .filter((c) => c.source_ref_type !== 'PLASMA_JOB' && c.source_ref_type !== 'FAB_JOB')
                            .map((line) => (
                              <TableRow key={line.id}>
                                <TableCell>{line.description}</TableCell>
                                <TableCell className="text-right">{line.qty}</TableCell>
                                <TableCell className="text-right">${line.unit_price.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-medium">${line.total_price.toFixed(2)}</TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
            </TabsContent>

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

            <TabsContent value="fabrication">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium">Fabrication</h3>
                  {fabLocked && (
                    <Badge variant="outline" title="Editing disabled because the work order is invoiced">
                      Locked
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleRecalculateFabJob} disabled={!fabJob || fabLocked}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Recalculate
                  </Button>
                  <Button size="sm" onClick={handlePostFabJob} disabled={!fabJob || fabLines.length === 0 || fabLocked}>
                    <FileCheck className="w-4 h-4 mr-2" />
                    Post to Work Order
                  </Button>
                </div>
              </div>
              {fabLocked && (
                <div className="mb-3 text-sm text-muted-foreground">
                  Fabrication is locked because the work order is invoiced.
                </div>
              )}
              {formattedFabWarnings.length > 0 && (
                <Alert className="mb-3 border border-border">
                  <AlertTitle>Needs inputs to calculate</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5 space-y-1">
                      {formattedFabWarnings.map((w) => (
                        <li key={w.key}>
                          {w.typeLabel}
                          {w.lineNumber ? ` line ${w.lineNumber}` : ''} — {w.message}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-3">
                {!fabJob || fabLines.length === 0 ? (
                  <div className="border rounded-lg p-6 text-center text-muted-foreground">No fabrication lines yet</div>
                ) : (
                  fabLines.map((line) => {
                    const missingInfo = getFabMissingInfo(line);
                    return (
                    <div key={line.id} className="border rounded-lg p-3 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-[180px]">
                          <Label>Operation</Label>
                          <Select
                            value={line.operation_type}
                            onValueChange={(val) => handleFabOperationChange(line.id, val as 'PRESS_BRAKE' | 'WELD')}
                            disabled={fabLocked}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PRESS_BRAKE">Press Brake</SelectItem>
                              <SelectItem value="WELD">Welding</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="min-w-[120px]">
                          <Label>Qty</Label>
                          <Input
                            type="number"
                            min="0"
                            value={line.qty ?? 0}
                            disabled={fabLocked}
                            onChange={(e) => handleFabNumberChange(line.id, 'qty', e.target.value)}
                          />
                        </div>
                        <div className="min-w-[180px] flex-1">
                          <Label>Material</Label>
                          <Input
                            value={line.material_type ?? ''}
                            disabled={fabLocked}
                            onChange={(e) => handleFabTextChange(line.id, 'material_type', e.target.value)}
                            placeholder="e.g. A36 Steel"
                          />
                        </div>
                        <div className="min-w-[160px]">
                          <Label>Thickness</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={line.thickness ?? ''}
                            disabled={fabLocked}
                            onChange={(e) => handleFabNumberChange(line.id, 'thickness', e.target.value)}
                          />
                        </div>
                        <div className="min-w-[220px] flex-1">
                          <Label>Description</Label>
                          <Input
                            value={line.description ?? ''}
                            disabled={fabLocked}
                            onChange={(e) => handleFabTextChange(line.id, 'description', e.target.value)}
                            placeholder="Panel bend, frame weld, etc."
                          />
                        </div>
                      </div>

                      {line.operation_type === 'PRESS_BRAKE' ? (
                        <div className="grid md:grid-cols-3 gap-3">
                          <div>
                            <Label>Bends</Label>
                            <Input
                              type="number"
                              min="0"
                              value={line.bends_count ?? ''}
                              disabled={fabLocked}
                              onChange={(e) => handleFabNumberChange(line.id, 'bends_count', e.target.value)}
                            />
                            {showFabValidation && missingInfo.missingFields.includes('bends count') && (
                              <p className="text-xs text-muted-foreground mt-1">Required to calculate pricing.</p>
                            )}
                          </div>
                          <div>
                            <Label>Bend Length (in)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.bend_length ?? ''}
                              disabled={fabLocked}
                              onChange={(e) => handleFabNumberChange(line.id, 'bend_length', e.target.value)}
                            />
                            {showFabValidation && missingInfo.missingFields.includes('bend length (in)') && (
                              <p className="text-xs text-muted-foreground mt-1">Required to calculate pricing.</p>
                            )}
                          </div>
                          <div>
                            <Label>Tooling</Label>
                            <Input
                              value={line.tooling ?? ''}
                              disabled={fabLocked}
                              onChange={(e) => handleFabTextChange(line.id, 'tooling', e.target.value)}
                              placeholder="Tooling notes"
                            />
                          </div>
                          <div>
                            <Label>Tonnage Estimate</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={line.tonnage_estimate ?? ''}
                              disabled={fabLocked}
                              onChange={(e) => handleFabNumberChange(line.id, 'tonnage_estimate', e.target.value)}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid md:grid-cols-3 gap-3">
                          <div>
                            <Label>Process</Label>
                            <Select
                              value={line.weld_process ?? undefined}
                              onValueChange={(val) => val !== '__NONE__' && handleFabWeldProcessChange(line.id, val as FabJobLine['weld_process'])}
                              disabled={fabLocked}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select process" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__NONE__" disabled>
                                  Select process
                                </SelectItem>
                                <SelectItem value="MIG">MIG</SelectItem>
                                <SelectItem value="TIG">TIG</SelectItem>
                                <SelectItem value="STICK">Stick</SelectItem>
                                <SelectItem value="FLUX">Flux Core</SelectItem>
                              </SelectContent>
                            </Select>
                            {showFabValidation && missingInfo.missingFields.includes('weld process') && (
                              <p className="text-xs text-muted-foreground mt-1">Required to calculate pricing.</p>
                            )}
                          </div>
                          <div>
                            <Label>Weld Length (in)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.weld_length ?? ''}
                              disabled={fabLocked}
                              onChange={(e) => handleFabNumberChange(line.id, 'weld_length', e.target.value)}
                            />
                            {showFabValidation && missingInfo.missingFields.includes('weld length (in)') && (
                              <p className="text-xs text-muted-foreground mt-1">Required to calculate pricing.</p>
                            )}
                          </div>
                          <div>
                            <Label>Weld Type</Label>
                            <Select
                              value={line.weld_type ?? undefined}
                              onValueChange={(val) => val !== '__NONE__' && handleFabWeldTypeChange(line.id, val as FabJobLine['weld_type'])}
                              disabled={fabLocked}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__NONE__" disabled>
                                  Select type
                                </SelectItem>
                                <SelectItem value="FILLET">Fillet</SelectItem>
                                <SelectItem value="BUTT">Butt</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Position</Label>
                            <Input
                              value={line.position ?? ''}
                              disabled={fabLocked}
                              onChange={(e) => handleFabTextChange(line.id, 'position', e.target.value)}
                              placeholder="Flat, overhead, etc."
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Setup Minutes</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            value={line.setup_minutes ?? ''}
                            disabled={fabLocked}
                            onChange={(e) => handleFabNumberChange(line.id, 'setup_minutes', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Checkbox
                              checked={line.override_machine_minutes ?? false}
                              onCheckedChange={(checked) => handleFabToggleOverride(line.id, 'override_machine_minutes', checked === true)}
                              disabled={fabLocked}
                            />
                            Override Machine Minutes
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            value={line.machine_minutes ?? ''}
                            disabled={fabLocked || !line.override_machine_minutes}
                            onChange={(e) => handleFabNumberChange(line.id, 'machine_minutes', e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            {!line.override_machine_minutes && line.derived_machine_minutes != null
                              ? `Derived: ${line.derived_machine_minutes.toFixed(2)} min`
                              : 'Manual entry when override is enabled'}
                          </p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-3">
                        <div>
                          <Label className="flex items-center gap-2">
                            <Checkbox
                              checked={line.override_consumables_cost ?? false}
                              onCheckedChange={(checked) => handleFabToggleOverride(line.id, 'override_consumables_cost', checked === true)}
                              disabled={fabLocked}
                            />
                            Override Consumables
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.consumables_cost ?? 0}
                            disabled={fabLocked || !line.override_consumables_cost}
                            onChange={(e) => handleFabNumberChange(line.id, 'consumables_cost', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-2">
                            <Checkbox
                              checked={line.override_labor_cost ?? false}
                              onCheckedChange={(checked) => handleFabToggleOverride(line.id, 'override_labor_cost', checked === true)}
                              disabled={fabLocked}
                            />
                            Override Labor
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.labor_cost ?? 0}
                            disabled={fabLocked || !line.override_labor_cost}
                            onChange={(e) => handleFabNumberChange(line.id, 'labor_cost', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Notes</Label>
                          <Input
                            value={line.notes ?? ''}
                            disabled={fabLocked}
                            onChange={(e) => handleFabTextChange(line.id, 'notes', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm text-muted-foreground">
                          Setup {line.setup_minutes ?? 0} min · Machine {line.machine_minutes ?? 0} min
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-right">
                            <div className="font-medium">Unit: ${line.sell_price_each?.toFixed(2) ?? '0.00'}</div>
                            <div className="text-muted-foreground text-xs">Line Total: ${line.sell_price_total?.toFixed(2) ?? '0.00'}</div>
                          </div>
                          {!fabLocked && (
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteFabLine(line.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                {!fabLocked && (
                  <Button variant="outline" size="sm" onClick={handleAddFabLine}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Line
                  </Button>
                )}
                <div className="text-sm text-right space-y-1">
                  <div className="font-medium">Fabrication Total: ${fabTotal.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">
                    Qty {fabSummary.total_qty} · Setup {fabSummary.total_setup_minutes.toFixed(2)} min · Machine {fabSummary.total_machine_minutes.toFixed(2)} min · Cost ${fabSummary.total_cost.toFixed(2)}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="plasma">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium">Plasma</h3>
                  {plasmaChargeLine && (
                    <Badge variant="secondary">
                      Posted to WO {plasmaChargeLine.work_order_id}{' '}
                      {plasmaJob?.posted_at ? `on ${new Date(plasmaJob.posted_at).toLocaleString()}` : ''}
                    </Badge>
                  )}
                  {plasmaLocked && (
                    <Badge variant="outline" title="Editing disabled for posted or invoiced orders">
                      Locked
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleRecalculatePlasmaJob} disabled={!plasmaJob || plasmaLocked}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Recalculate
                  </Button>
                  <Button size="sm" onClick={handlePostPlasmaJob} disabled={!plasmaJob || plasmaLines.length === 0 || plasmaLocked}>
                    <FileCheck className="w-4 h-4 mr-2" />
                    Post to Work Order
                  </Button>
                  {plasmaJob && (
                    <Button size="sm" variant="outline" onClick={() => navigate(`/plasma/${plasmaJob.id}/print`)}>
                      Print Cut Sheet
                    </Button>
                  )}
                  {plasmaTemplateOptions.length > 0 && plasmaJob && (
                    <Select
                      onValueChange={(val) => {
                        if (val === '__NONE__') return;
                        const result = plasmaRepo.templates.applyToJob(val, plasmaJob.id);
                        if (!result.success) {
                          toast({ title: 'Template error', description: result.error, variant: 'destructive' });
                        } else {
                          toast({ title: 'Template applied' });
                        }
                      }}
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Add from Template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__NONE__" disabled>
                          Select template
                        </SelectItem>
                        {plasmaTemplateOptions.map((tpl) => (
                          <SelectItem key={tpl.id} value={tpl.id}>
                            {tpl.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {currentOrder && (
                    <Button size="sm" variant="outline" onClick={() => navigate(`/work-orders/${currentOrder.id}`)}>
                      View Work Order
                    </Button>
                  )}
                </div>
              </div>
              {plasmaLocked && (
                <div className="mb-3 text-sm text-muted-foreground">
                  Plasma lines are locked because the job is posted or the work order is invoiced.
                </div>
              )}
              {plasmaWarnings.length > 0 && (
                <div className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  {plasmaWarnings.map((w) => (
                    <div key={w}>{w}</div>
                  ))}
                </div>
              )}
              {plasmaJob && (
                <div className="mb-4 border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">DXF Assist</h4>
                      <p className="text-sm text-muted-foreground">
                        Optional estimates for cut length, pierces, and machine time.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setDxfAssistOpen((v) => !v)}>
                      {dxfAssistOpen ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                  {dxfAssistOpen && (
                    <div className="mt-3 grid md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <Label>Total Cut Length (in)</Label>
                        <Input
                          type="number"
                          value={plasmaJob.dxf_estimated_total_cut_length ?? ''}
                          onChange={(e) =>
                            plasmaRepo.updateJob(plasmaJob.id, {
                              dxf_estimated_total_cut_length: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Total Pierces</Label>
                        <Input
                          type="number"
                          value={plasmaJob.dxf_estimated_total_pierces ?? ''}
                          onChange={(e) =>
                            plasmaRepo.updateJob(plasmaJob.id, {
                              dxf_estimated_total_pierces: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>Machine Minutes</Label>
                        <Input
                          type="number"
                          value={plasmaJob.dxf_estimated_machine_minutes ?? ''}
                          onChange={(e) =>
                            plasmaRepo.updateJob(plasmaJob.id, {
                              dxf_estimated_machine_minutes: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>DXF Notes</Label>
                        <Input
                          value={plasmaJob.dxf_notes ?? ''}
                          onChange={(e) =>
                            plasmaRepo.updateJob(plasmaJob.id, {
                              dxf_notes: e.target.value || null,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="table-container">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Thickness</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Cut Length</TableHead>
                      <TableHead className="text-right">Pierces</TableHead>
                      <TableHead className="text-right">Setup (min)</TableHead>
                      <TableHead className="text-right">Machine (min)</TableHead>
                      <TableHead className="text-right">Derived?</TableHead>
                      <TableHead className="text-right">Unit Sell</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      {!isInvoiced && <TableHead className="w-10"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!plasmaJob || plasmaLines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isInvoiced ? 9 : 10} className="text-center text-muted-foreground py-8">
                          No plasma lines yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      plasmaLines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <Input
                              value={line.material_type ?? ''}
                              disabled={plasmaLocked}
                              onChange={(e) => handlePlasmaTextChange(line.id, e.target.value)}
                              placeholder="Material"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.thickness ?? ''}
                              disabled={plasmaLocked}
                              onChange={(e) => handlePlasmaNumberChange(line.id, 'thickness', e.target.value)}
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={line.qty}
                              disabled={plasmaLocked}
                              onChange={(e) => handlePlasmaNumberChange(line.id, 'qty', e.target.value)}
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.cut_length ?? ''}
                              disabled={plasmaLocked}
                              onChange={(e) => handlePlasmaNumberChange(line.id, 'cut_length', e.target.value)}
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={line.pierce_count ?? ''}
                              disabled={plasmaLocked}
                              onChange={(e) => handlePlasmaNumberChange(line.id, 'pierce_count', e.target.value)}
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              value={line.setup_minutes ?? ''}
                              disabled={plasmaLocked}
                              onChange={(e) => handlePlasmaNumberChange(line.id, 'setup_minutes', e.target.value)}
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              value={line.machine_minutes ?? ''}
                              disabled={plasmaLocked}
                              onChange={(e) => handlePlasmaNumberChange(line.id, 'machine_minutes', e.target.value)}
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {line.override_machine_minutes ? (
                              <Badge variant="outline">Override</Badge>
                            ) : line.derived_machine_minutes != null ? (
                              <Badge variant="secondary">Derived</Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.sell_price_each ?? 0}
                              disabled={isInvoiced}
                              onChange={(e) => handlePlasmaSellPriceChange(line.id, e.target.value)}
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">${(line.sell_price_total ?? 0).toFixed(2)}</TableCell>
                          {!plasmaLocked && (
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    handleRecalculatePlasmaJob();
                                  }}
                                >
                                  Quick-Fill
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeletePlasmaLine(line.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-3 flex items-center justify-between">
                {!plasmaLocked && (
                  <Button variant="outline" size="sm" onClick={handleAddPlasmaLine}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Line
                  </Button>
                )}
                <div className="text-sm text-right space-y-1">
                  <div className="font-medium">Plasma Total: ${plasmaTotal.toFixed(2)}</div>
                  {plasmaChargeLine && (
                    <div className="text-muted-foreground">
                      Posted as "{plasmaChargeLine.description}" (${plasmaChargeLine.total_price.toFixed(2)})
                    </div>
                  )}
                  {plasmaJob && (
                    <div className="text-xs text-muted-foreground">
                      From Lines: Cut {plasmaLines.reduce((s, l) => s + (l.cut_length ?? 0) * (l.qty ?? 0), 0).toFixed(2)} in, Pierces{' '}
                      {plasmaLines.reduce((s, l) => s + (l.pierce_count ?? 0) * (l.qty ?? 0), 0)}{' '}
                      {plasmaLines.some((l) => l.machine_minutes) && (
                        <>· Machine {plasmaLines.reduce((s, l) => s + (l.machine_minutes ?? 0) * (l.qty ?? 0), 0).toFixed(2)} min</>
                      )}
                      {plasmaJob.dxf_estimated_total_cut_length != null && (
                        <>
                          {' '}
                          | DXF: Cut {plasmaJob.dxf_estimated_total_cut_length} in, Pierces {plasmaJob.dxf_estimated_total_pierces ?? '-'} · Machine{' '}
                          {plasmaJob.dxf_estimated_machine_minutes ?? '-'} min
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Attachments</h4>
                    <p className="text-sm text-muted-foreground">
                      DXF parsing/nesting not enabled yet — attachments are for reference.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={attachmentInputRef}
                      type="file"
                      accept=".dxf,.pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => handleAttachmentUpload(e.target.files?.[0])}
                      disabled={plasmaLocked}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={plasmaLocked}
                    >
                      Upload
                    </Button>
                  </div>
                </div>
                <div className="table-container">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filename</TableHead>
                        <TableHead>Kind</TableHead>
                        <TableHead className="text-right">Size</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Added</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plasmaAttachments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                            No attachments yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        plasmaAttachments.map((att) => (
                          <TableRow key={att.id}>
                            <TableCell className="font-medium">{att.filename}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{att.kind}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {(att.size_bytes / 1024 / 1024).toFixed(2)} MB
                            </TableCell>
                            <TableCell>
                              <Input
                                defaultValue={att.notes ?? ''}
                                onBlur={(e) => handleAttachmentNoteChange(att.id, e.target.value)}
                                disabled={plasmaLocked}
                              />
                            </TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                              {new Date(att.created_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {!plasmaLocked && (
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveAttachment(att.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
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
              {(currentOrder?.charge_subtotal ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Charges:</span>
                  <span>${(currentOrder?.charge_subtotal ?? 0).toFixed(2)}</span>
                </div>
              )}
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

      {currentOrder && (
        <div className="form-section mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Warranty Claims</h2>
            <Dialog open={createClaimOpen} onOpenChange={setCreateClaimOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Warranty Claim
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Warranty Claim</DialogTitle>
                  <DialogDescription>Select a vendor to start a claim.</DialogDescription>
                </DialogHeader>
                <Select value={selectedClaimVendor} onValueChange={setSelectedClaimVendor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.vendor_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateClaimOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      const vendorId = selectedClaimVendor || vendors[0]?.id;
                      if (!vendorId) return;
                      const claim = createWarrantyClaim({ vendor_id: vendorId, work_order_id: currentOrder.id });
                      if (claim) {
                        setCreateClaimOpen(false);
                        setSelectedClaimVendor('');
                        navigate(`/warranty/${claim.id}`);
                      }
                    }}
                    disabled={!selectedClaimVendor && vendors.length === 0}
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {workOrderClaims.length === 0 ? (
            <p className="text-sm text-muted-foreground">No warranty claims linked to this work order.</p>
          ) : (
            <div className="space-y-2">
              {workOrderClaims.map((claim) => (
                <div key={claim.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{claim.claim_number || claim.id}</span>
                    <StatusBadge status={claim.status} />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/warranty/${claim.id}`)}>
                    Open
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div id="wo-tech-print" className="hidden">
        <div className="space-y-4 p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xl font-semibold">{settings.shop_name}</div>
              <div className="text-sm text-muted-foreground">Work Order {currentOrder?.order_number}</div>
              <div className="text-sm text-muted-foreground">Status: {currentOrder?.status}</div>
            </div>
            <div className="text-sm text-muted-foreground text-right">
              <div>{new Date().toLocaleDateString()}</div>
              {customer && <div>{customer.company_name}</div>}
              {unit && (
                <div>
                  {unit.year} {unit.make} {unit.model} {unit.vin ? `(${unit.vin})` : ''}
                </div>
              )}
            </div>
          </div>

          <div className="border rounded-lg p-3">
            <h4 className="font-medium mb-2">Parts</h4>
            <div className="space-y-2">
              {partLines.length === 0 ? (
                <div className="text-sm text-muted-foreground">No parts</div>
              ) : (
                partLines.map((line) => {
                  const part = parts.find((p) => p.id === line.part_id);
                  return (
                    <div key={line.id} className="flex items-center gap-3 text-sm">
                      <input type="checkbox" className="h-4 w-4" />
                      <div className="flex-1">
                        <div className="font-medium">{part?.part_number || line.description || 'Part'}</div>
                        <div className="text-muted-foreground">
                          Qty {line.quantity} {part?.bin_location ? `· Bin ${part.bin_location}` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="border rounded-lg p-3">
            <h4 className="font-medium mb-2">Labor</h4>
            <div className="space-y-2">
              {laborLines.length === 0 ? (
                <div className="text-sm text-muted-foreground">No labor</div>
              ) : (
                laborLines.map((line) => (
                  <div key={line.id} className="flex items-center gap-3 text-sm">
                    <input type="checkbox" className="h-4 w-4" />
                    <div className="flex-1">
                      <div className="font-medium">{line.description}</div>
                      <div className="text-muted-foreground">Hours: {line.hours}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border rounded-lg p-3">
            <h4 className="font-medium mb-2">Fabrication</h4>
            <div className="space-y-2">
              {fabLines.length === 0 ? (
                <div className="text-sm text-muted-foreground">No fabrication lines</div>
              ) : (
                fabLines.map((line) => (
                  <div key={line.id} className="flex items-start gap-3 text-sm">
                    <input type="checkbox" className="h-4 w-4 mt-1" />
                    <div className="flex-1 space-y-1">
                      <div className="font-medium">
                        {line.operation_type === 'PRESS_BRAKE' ? 'Press Brake' : 'Weld'} · {line.description || 'Line'}
                      </div>
                      {line.operation_type === 'PRESS_BRAKE' ? (
                        <div className="text-muted-foreground">
                          Bends: {line.bends_count ?? '-'} · Bend Length: {line.bend_length ?? '-'} in · Setup: {line.setup_minutes ?? 0} min · Machine:{' '}
                          {line.machine_minutes ?? 0} min
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          Process: {line.weld_process || '-'} · Length: {line.weld_length ?? '-'} in · Setup: {line.setup_minutes ?? 0} min · Machine:{' '}
                          {line.machine_minutes ?? 0} min
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border rounded-lg p-3">
            <h4 className="font-medium mb-2">Plasma</h4>
            <div className="space-y-2">
              {plasmaLines.length === 0 ? (
                <div className="text-sm text-muted-foreground">No plasma lines</div>
              ) : (
                plasmaLines.map((line) => (
                  <div key={line.id} className="flex items-center gap-3 text-sm">
                    <input type="checkbox" className="h-4 w-4" />
                    <div className="flex-1">
                      <div className="font-medium">{line.material_type || 'Plasma Line'}</div>
                      <div className="text-muted-foreground">
                        Qty {line.qty} · Thickness {line.thickness ?? '-'} · Machine {line.machine_minutes ?? 0} min
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border rounded-lg p-3">
            <h4 className="font-medium mb-2">Notes</h4>
            <div className="h-24 border rounded-md" />
          </div>

          <div className="border rounded-lg p-3">
            <h4 className="font-medium mb-2">Sign-off</h4>
            <div className="grid gap-4 sm:grid-cols-3 text-sm">
              <div>
                <div className="text-muted-foreground">Technician</div>
                <div className="border-b border-dashed h-8" />
              </div>
              <div>
                <div className="text-muted-foreground">Date</div>
                <div className="border-b border-dashed h-8" />
              </div>
              <div>
                <div className="text-muted-foreground">Signature</div>
                <div className="border-b border-dashed h-8" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Invoice */}
      {/* Print Invoice */}
      {currentOrder && (
        <>
          {printMode === 'invoice' && (
            <PrintWorkOrder order={currentOrder} partLines={partLines} laborLines={laborLines} customer={customer} unit={unit} parts={parts} shopName={settings.shop_name} />
          )}
          {printMode === 'picklist' && (
            <PrintWorkOrderPickList order={currentOrder} partLines={partLines} laborLines={laborLines} customer={customer} unit={unit} parts={parts} shopName={settings.shop_name} />
          )}
        </>
      )}

      {/* Add Part Dialog */}
      <QuickAddDialog open={addPartDialogOpen} onOpenChange={setAddPartDialogOpen} title="Add Part" onSave={handleAddPart} onCancel={() => setAddPartDialogOpen(false)}>
        <div className="space-y-4">
          <div className="space-y-2">
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

      {/* Quick Add Part */}
      <QuickAddDialog
        open={newPartDialogOpen}
        onOpenChange={setNewPartDialogOpen}
        title="Quick Add Part"
        onSave={handleQuickAddPart}
        onCancel={() => setNewPartDialogOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <Label>Part Number *</Label>
            <Input
              value={newPartData.part_number}
              onChange={(e) => setNewPartData({ ...newPartData, part_number: e.target.value })}
              placeholder="e.g., BRK-001"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={newPartData.description}
              onChange={(e) => setNewPartData({ ...newPartData, description: e.target.value })}
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
                value={newPartData.cost}
                onChange={(e) => setNewPartData({ ...newPartData, cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Selling Price</Label>
              <Input
                type="number"
                value={newPartData.selling_price}
                onChange={(e) => setNewPartData({ ...newPartData, selling_price: e.target.value })}
                placeholder="0.00"
              />
            </div>
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
