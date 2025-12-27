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

export default function PartForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const repos = useRepos();
  const {
    parts,
    addPart,
    updatePart,
    deactivatePart,
  } = repos.parts;
  const { vendors } = repos.vendors;
  const { categories } = repos.categories;
  const { addVendor } = repos.vendors;
  const { addCategory } = repos.categories;
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
  });

  // Quick add dialogs
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  const activeVendors = vendors.filter((v) => v.is_active);
  const activeCategories = categories.filter((c) => c.is_active);

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
    };

    if (isNew) {
      const newPart = addPart(partData);
      toast({ title: 'Part Created', description: `${formData.part_number} has been added` });
      navigate(`/inventory/${newPart.id}`);
    } else {
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
    </div>
  );
}
