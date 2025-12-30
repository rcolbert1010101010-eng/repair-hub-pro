import { useState } from 'react';
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
import { useRepos } from '@/repos';
import { useToast } from '@/hooks/use-toast';
import { Save, X, Trash2, Edit, Plus } from 'lucide-react';
import { QuickAddDialog } from '@/components/ui/quick-add-dialog';
import { calcPartPriceForLevel, getPartCostBasis } from '@/domain/pricing/partPricing';

export default function PartForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const repos = useRepos();
  const {
    parts,
    addPart,
    updatePart,
    updatePartWithQohAdjustment,
    deactivatePart,
  } = repos.parts;
  const { vendors } = repos.vendors;
  const { categories } = repos.categories;
  const { addVendor } = repos.vendors;
  const { addCategory } = repos.categories;
  const { vendorCostHistory } = repos.vendorCostHistory;
  const { purchaseOrders, purchaseOrderLines } = repos.purchaseOrders;
  const { settings } = repos.settings;
  const { toast } = useToast();

  const isNew = id === 'new';
  const part = !isNew ? parts.find((p) => p.id === id) : null;

  const [editing, setEditing] = useState(isNew);
  const [formData, setFormData] = useState({
    part_number: part?.part_number || '',
    description: part?.description || '',
    vendor_id: part?.vendor_id || '',
    category_id: part?.category_id || '',
    cost: part?.cost?.toString() || '',
    selling_price: part?.selling_price?.toString() || '',
    quantity_on_hand: part?.quantity_on_hand?.toString() || '0',
    core_required: part?.core_required || false,
    core_charge: part?.core_charge?.toString() || '0',
    min_qty: part?.min_qty?.toString() || '',
    max_qty: part?.max_qty?.toString() || '',
    bin_location: part?.bin_location ?? '',
    model: part?.model ?? '',
    serial_number: part?.serial_number ?? '',
  });

  // Quick add dialogs
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [pendingPartData, setPendingPartData] = useState<null | typeof formData>(null);

  const activeVendors = vendors.filter((v) => v.is_active);
  const activeCategories = categories.filter((c) => c.is_active);
  const partCostHistory = vendorCostHistory
    .filter((h) => h.part_id === id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 15);

  const tempPartForPricing: Part = part || {
    id: 'temp',
    part_number: formData.part_number,
    description: formData.description || null,
    vendor_id: formData.vendor_id,
    category_id: formData.category_id,
    cost: parseFloat(formData.cost) || 0,
    selling_price: parseFloat(formData.selling_price) || 0,
    quantity_on_hand: parseInt(formData.quantity_on_hand) || 0,
    core_required: part?.core_required ?? false,
    core_charge: parseFloat(formData.core_charge) || 0,
    min_qty: formData.min_qty === '' ? null : (Number.isFinite(parseInt(formData.min_qty)) ? parseInt(formData.min_qty) : null),
    max_qty: formData.max_qty === '' ? null : (Number.isFinite(parseInt(formData.max_qty)) ? parseInt(formData.max_qty) : null),
    bin_location: formData.bin_location.trim() || null,
    last_cost: part?.last_cost ?? null,
    avg_cost: part?.avg_cost ?? null,
    model: part?.model ?? null,
    serial_number: part?.serial_number ?? null,
    is_active: true,
    created_at: '',
    updated_at: '',
  };

  const costBasis = getPartCostBasis(tempPartForPricing);
  const suggestedRetail = calcPartPriceForLevel(tempPartForPricing, settings, 'RETAIL');
  const suggestedFleet = calcPartPriceForLevel(tempPartForPricing, settings, 'FLEET');
  const suggestedWholesale = calcPartPriceForLevel(tempPartForPricing, settings, 'WHOLESALE');
  const poLinesForPart = part
    ? purchaseOrderLines
        .map((line) => {
          const po = purchaseOrders.find((p) => p.id === line.purchase_order_id);
          return { line, po };
        })
        .filter(({ line, po }) => po && po.status === 'OPEN' && line.part_id === part.id)
    : [];
  const poLinesWithOutstanding = poLinesForPart
    .map(({ line, po }) => {
      const outstanding = (line.ordered_quantity ?? 0) - (line.received_quantity ?? 0);
      return { line, po: po!, outstanding: Math.max(0, outstanding) };
    })
    .filter((entry) => entry.outstanding > 0);
  const totalOnOrder = poLinesWithOutstanding.reduce((sum, entry) => sum + entry.outstanding, 0);
  const poLinesSorted = poLinesWithOutstanding.sort(
    (a, b) => new Date(b.po.created_at).getTime() - new Date(a.po.created_at).getTime()
  );

  if (!isNew && !part) {
    return (
      <div className="page-container">
        <PageHeader title="Part Not Found" backTo="/inventory" />
        <p className="text-muted-foreground">This part does not exist.</p>
      </div>
    );
  }

  const handleSave = () => {
    if (!formData.part_number.trim()) {
      toast({ title: 'Validation Error', description: 'Part number is required', variant: 'destructive' });
      return;
    }
    if (!formData.vendor_id) {
      toast({ title: 'Validation Error', description: 'Vendor is required', variant: 'destructive' });
      return;
    }
    if (!formData.category_id) {
      toast({ title: 'Validation Error', description: 'Category is required', variant: 'destructive' });
      return;
    }

    // Check for duplicate part number
    const exists = parts.some(
      (p) => p.id !== id && p.part_number.toLowerCase() === formData.part_number.toLowerCase()
    );
    if (exists) {
      toast({ title: 'Validation Error', description: 'A part with this number already exists', variant: 'destructive' });
      return;
    }

    const partData = {
      part_number: formData.part_number.trim().toUpperCase(),
      description: formData.description.trim() || null,
      vendor_id: formData.vendor_id,
      category_id: formData.category_id,
      cost: parseFloat(formData.cost) || 0,
      selling_price: parseFloat(formData.selling_price) || 0,
      quantity_on_hand: parseInt(formData.quantity_on_hand) || 0,
      core_required: formData.core_required,
      core_charge: parseFloat(formData.core_charge) || 0,
      min_qty: formData.min_qty === '' ? null : (Number.isFinite(parseInt(formData.min_qty)) ? parseInt(formData.min_qty) : null),
      max_qty: formData.max_qty === '' ? null : (Number.isFinite(parseInt(formData.max_qty)) ? parseInt(formData.max_qty) : null),
      bin_location: formData.bin_location.trim() || null,
      model: formData.model.trim() || null,
      serial_number: formData.serial_number.trim() || null,
    };

    if (isNew) {
      const newPart = addPart(partData);
      toast({ title: 'Part Created', description: `${formData.part_number} has been added` });
      navigate(`/inventory/${newPart.id}`);
    } else {
      const qohChanged = part && part.quantity_on_hand !== partData.quantity_on_hand;
      if (qohChanged) {
        setPendingPartData(formData);
        setAdjustDialogOpen(true);
        return;
      }
      updatePart(id!, partData);
      toast({ title: 'Part Updated', description: 'Changes have been saved' });
      setEditing(false);
    }
  };

  const handleDeactivate = () => {
    deactivatePart(id!);
    toast({ title: 'Part Deactivated', description: 'Part has been deactivated' });
    navigate('/inventory');
  };

  const handleQuickAddVendor = () => {
    if (!newVendorName.trim()) return;
    const newVendor = addVendor({
      vendor_name: newVendorName.trim(),
      phone: null,
      email: null,
      notes: null,
    });
    setFormData({ ...formData, vendor_id: newVendor.id });
    setVendorDialogOpen(false);
    setNewVendorName('');
    toast({ title: 'Vendor Added', description: `${newVendor.vendor_name} has been created` });
  };

  const handleQuickAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCategory = addCategory({
      category_name: newCategoryName.trim(),
      description: null,
    });
    setFormData({ ...formData, category_id: newCategory.id });
    setCategoryDialogOpen(false);
    setNewCategoryName('');
    toast({ title: 'Category Added', description: `${newCategory.category_name} has been created` });
  };

  const handleConfirmAdjustment = () => {
    if (!pendingPartData || !part) return;
    if (!adjustReason.trim()) {
      toast({ title: 'Validation Error', description: 'Reason is required', variant: 'destructive' });
      return;
    }
    const partData = {
      part_number: pendingPartData.part_number.trim().toUpperCase(),
      description: pendingPartData.description.trim() || null,
      vendor_id: pendingPartData.vendor_id,
      category_id: pendingPartData.category_id,
      cost: parseFloat(pendingPartData.cost) || 0,
      selling_price: parseFloat(pendingPartData.selling_price) || 0,
      quantity_on_hand: parseInt(pendingPartData.quantity_on_hand) || 0,
      core_required: pendingPartData.core_required,
      core_charge: parseFloat(pendingPartData.core_charge) || 0,
      min_qty: pendingPartData.min_qty === '' ? null : (Number.isFinite(parseInt(pendingPartData.min_qty)) ? parseInt(pendingPartData.min_qty) : null),
      max_qty: pendingPartData.max_qty === '' ? null : (Number.isFinite(parseInt(pendingPartData.max_qty)) ? parseInt(pendingPartData.max_qty) : null),
      bin_location: pendingPartData.bin_location.trim() || null,
    };
    updatePartWithQohAdjustment(id!, partData, { reason: adjustReason.trim(), adjusted_by: 'system' });
    toast({ title: 'Part Updated', description: 'Changes have been saved' });
    setAdjustDialogOpen(false);
    setAdjustReason('');
    setPendingPartData(null);
    setEditing(false);
  };

  return (
    <div className="page-container">
      <PageHeader
        title={isNew ? 'New Part' : part?.part_number || 'Part'}
        subtitle={isNew ? 'Add a new part to inventory' : part?.is_active ? 'Active Part' : 'Inactive Part'}
        backTo="/inventory"
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
                {isNew ? 'Create Part' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              {part?.is_active && (
                <Button variant="destructive" onClick={handleDeactivate}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Deactivate
                </Button>
              )}
            </>
          )
        }
      />

      <div className="form-section max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="part_number">Part Number *</Label>
              <Input
                id="part_number"
                value={formData.part_number}
                onChange={(e) => setFormData({ ...formData, part_number: e.target.value.toUpperCase() })}
                disabled={!editing}
                placeholder="e.g., BRK-001"
                className="font-mono"
              />
            </div>
            <div>
              <Label htmlFor="quantity_on_hand">Quantity on Hand</Label>
              <Input
                id="quantity_on_hand"
                type="number"
                value={formData.quantity_on_hand}
                onChange={(e) => setFormData({ ...formData, quantity_on_hand: e.target.value })}
                disabled={!editing}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                disabled={!editing}
              />
            </div>
            <div>
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                disabled={!editing}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="min_qty">Min Qty</Label>
              <Input
                id="min_qty"
                type="number"
                value={formData.min_qty}
                onChange={(e) => setFormData({ ...formData, min_qty: e.target.value })}
                disabled={!editing}
              />
            </div>
            <div>
              <Label htmlFor="max_qty">Max Qty</Label>
              <Input
                id="max_qty"
                type="number"
                value={formData.max_qty}
                onChange={(e) => setFormData({ ...formData, max_qty: e.target.value })}
                disabled={!editing}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={!editing}
              rows={2}
              placeholder="Part description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bin_location">Bin Location</Label>
              <Input
                id="bin_location"
                value={formData.bin_location}
                onChange={(e) => setFormData({ ...formData, bin_location: e.target.value })}
                disabled={!editing}
                placeholder="e.g., Aisle 3 - Bin 12"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vendor *</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.vendor_id}
                  onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}
                  disabled={!editing}
                >
                  <SelectTrigger className="flex-1">
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
                {editing && (
                  <Button type="button" variant="outline" size="icon" onClick={() => setVendorDialogOpen(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            <div>
              <Label>Category *</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  disabled={!editing}
                >
                  <SelectTrigger className="flex-1">
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
                {editing && (
                  <Button type="button" variant="outline" size="icon" onClick={() => setCategoryDialogOpen(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cost">Cost</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                disabled={!editing}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="selling_price">Selling Price</Label>
              <Input
                id="selling_price"
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                disabled={!editing}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Last Cost</Label>
              <Input
                value={part?.last_cost != null ? part.last_cost.toFixed(2) : '—'}
                disabled
                placeholder="N/A"
              />
            </div>
            <div>
              <Label>Avg Cost</Label>
              <Input
                value={part?.avg_cost != null ? part.avg_cost.toFixed(2) : '—'}
                disabled
                placeholder="N/A"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Suggested Basis</Label>
              <Input
                value={
                  costBasis.basis != null
                    ? `$${costBasis.basis.toFixed(2)} (${costBasis.source.replace('_', ' ')})`
                    : '—'
                }
                disabled
              />
            </div>
            {editing && (
              <div className="flex items-end justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (suggestedRetail != null) {
                      setFormData({ ...formData, selling_price: suggestedRetail.toFixed(2) });
                    }
                  }}
                >
                  Apply Retail Suggested
                </Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Retail Suggested</Label>
              <Input value={suggestedRetail != null ? suggestedRetail.toFixed(2) : '—'} disabled />
            </div>
            <div>
              <Label>Fleet Suggested</Label>
              <Input value={suggestedFleet != null ? suggestedFleet.toFixed(2) : '—'} disabled />
            </div>
            <div>
              <Label>Wholesale Suggested</Label>
              <Input value={suggestedWholesale != null ? suggestedWholesale.toFixed(2) : '—'} disabled />
            </div>
          </div>

          {!isNew && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold">Cost History</h3>
              {partCostHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No cost history yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-1">Date</th>
                      <th className="py-1">Vendor</th>
                      <th className="py-1 text-right">Unit Cost</th>
                      <th className="py-1 text-right">Qty</th>
                      <th className="py-1">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partCostHistory.map((entry) => {
                      const vendor = vendors.find((v) => v.id === entry.vendor_id);
                      return (
                        <tr key={entry.id} className="border-t border-border/60">
                          <td className="py-1">{new Date(entry.created_at).toLocaleDateString()}</td>
                          <td className="py-1">{vendor?.vendor_name || '—'}</td>
                          <td className="py-1 text-right">${entry.unit_cost.toFixed(2)}</td>
                          <td className="py-1 text-right">{entry.quantity ?? '—'}</td>
                          <td className="py-1 uppercase text-xs text-muted-foreground">{entry.source}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {!isNew && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">On Order</h3>
                <span className="text-sm font-medium">
                  {totalOnOrder > 0 ? 'Yes' : 'No'} (Qty: {totalOnOrder})
                </span>
              </div>
              {poLinesSorted.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open purchase orders for this part.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-1">PO</th>
                      <th className="py-1">Vendor</th>
                      <th className="py-1 text-right">Qty On Order</th>
                      <th className="py-1">Status</th>
                      <th className="py-1">Created</th>
                      <th className="py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {poLinesSorted.slice(0, 15).map(({ line, po, outstanding }) => {
                      const vendor = vendors.find((v) => v.id === po.vendor_id);
                      return (
                        <tr key={line.id} className="border-t border-border/60">
                          <td className="py-1 font-mono">{po.po_number || po.id}</td>
                          <td className="py-1">{vendor?.vendor_name || '—'}</td>
                          <td className="py-1 text-right">{outstanding}</td>
                          <td className="py-1">{po.status}</td>
                          <td className="py-1">{new Date(po.created_at).toLocaleDateString()}</td>
                          <td className="py-1 text-right">
                            <Button variant="link" size="sm" onClick={() => navigate(`/purchase-orders/${po.id}`)}>
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Core Charge Section */}
          <div className="border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="core_required"
                checked={formData.core_required}
                onChange={(e) => setFormData({ ...formData, core_required: e.target.checked })}
                disabled={!editing}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="core_required" className="font-medium">Core Required</Label>
            </div>
            {formData.core_required && (
              <div>
                <Label htmlFor="core_charge">Core Charge Amount</Label>
                <Input
                  id="core_charge"
                  type="number"
                  step="0.01"
                  value={formData.core_charge}
                  onChange={(e) => setFormData({ ...formData, core_charge: e.target.value })}
                  disabled={!editing}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This amount will be added to orders and refunded when the core is returned.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Add Vendor Dialog */}
      <QuickAddDialog
        open={vendorDialogOpen}
        onOpenChange={setVendorDialogOpen}
        title="Quick Add Vendor"
        onSave={handleQuickAddVendor}
        onCancel={() => setVendorDialogOpen(false)}
      >
        <div>
          <Label htmlFor="new_vendor_name">Vendor Name *</Label>
          <Input
            id="new_vendor_name"
            value={newVendorName}
            onChange={(e) => setNewVendorName(e.target.value)}
            placeholder="Enter vendor name"
          />
        </div>
      </QuickAddDialog>

      {/* Quick Add Category Dialog */}
      <QuickAddDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        title="Quick Add Category"
        onSave={handleQuickAddCategory}
        onCancel={() => setCategoryDialogOpen(false)}
      >
        <div>
          <Label htmlFor="new_category_name">Category Name *</Label>
          <Input
            id="new_category_name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Enter category name"
          />
        </div>
      </QuickAddDialog>

      {/* Inventory Adjustment Reason Dialog */}
      <QuickAddDialog
        open={adjustDialogOpen}
        onOpenChange={(open) => {
          setAdjustDialogOpen(open);
          if (!open) {
            setAdjustReason('');
            setPendingPartData(null);
          }
        }}
        title="Inventory Adjustment"
        onSave={handleConfirmAdjustment}
        onCancel={() => {
          setAdjustDialogOpen(false);
          setAdjustReason('');
          setPendingPartData(null);
        }}
      >
        <div>
          <Label htmlFor="adjust_reason">Reason *</Label>
          <Textarea
            id="adjust_reason"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            placeholder="Provide a reason for the quantity change"
            rows={3}
          />
        </div>
      </QuickAddDialog>
    </div>
  );
}
