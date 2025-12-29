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
import { Edit, Save, X, Trash2, Plus } from 'lucide-react';
import { DataTable, Column } from '@/components/ui/data-table';
import { AddUnitDialog } from '@/components/units/AddUnitDialog';
import type { Unit } from '@/types';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const repos = useRepos();
  const { customers, updateCustomer, deactivateCustomer } = repos.customers;
  const { units } = repos.units;
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);

  const customer = customers.find((c) => c.id === id);
  const customerUnits = units.filter((u) => u.customer_id === id);

  const [formData, setFormData] = useState({
    company_name: customer?.company_name || '',
    contact_name: customer?.contact_name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    notes: customer?.notes || '',
    price_level: customer?.price_level || 'RETAIL',
  });

  if (!customer) {
    return (
      <div className="page-container">
        <PageHeader title="Customer Not Found" backTo="/customers" />
        <p className="text-muted-foreground">This customer does not exist.</p>
      </div>
    );
  }

  const handleSave = () => {
    if (!formData.company_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Company name is required',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate company name (excluding self)
    const exists = customers.some(
      (c) => c.id !== id && c.company_name.toLowerCase() === formData.company_name.toLowerCase()
    );
    if (exists) {
      toast({
        title: 'Validation Error',
        description: 'A customer with this company name already exists',
        variant: 'destructive',
      });
      return;
    }

    updateCustomer(id!, {
      company_name: formData.company_name.trim(),
      contact_name: formData.contact_name.trim() || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      address: formData.address.trim() || null,
      notes: formData.notes.trim() || null,
      price_level: formData.price_level,
    });

    toast({
      title: 'Customer Updated',
      description: 'Changes have been saved',
    });
    setEditing(false);
  };

  const handleDeactivate = () => {
    const success = deactivateCustomer(id!);
    if (success) {
      toast({
        title: 'Customer Deactivated',
        description: 'Customer has been deactivated',
      });
      navigate('/customers');
    } else {
      toast({
        title: 'Cannot Deactivate',
        description: 'Customer has active orders and cannot be deactivated',
        variant: 'destructive',
      });
    }
  };

  const unitColumns: Column<Unit>[] = [
    { key: 'unit_name', header: 'Unit Name', sortable: true },
    { key: 'vin', header: 'VIN', sortable: true, className: 'font-mono' },
    { key: 'year', header: 'Year', sortable: true },
    { key: 'make', header: 'Make', sortable: true },
    { key: 'model', header: 'Model', sortable: true },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title={customer.company_name}
        subtitle={customer.is_active ? 'Active Customer' : 'Inactive Customer'}
        backTo="/customers"
        actions={
          editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              {customer.is_active && (
                <Button variant="destructive" onClick={handleDeactivate}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Deactivate
                </Button>
              )}
            </>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="form-section">
          <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                disabled={!editing}
              />
            </div>
            <div>
              <Label>Price Level</Label>
              <Select
                value={formData.price_level}
                onValueChange={(value) => setFormData({ ...formData, price_level: value as any })}
                disabled={!editing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select price level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RETAIL">Retail</SelectItem>
                  <SelectItem value="FLEET">Fleet</SelectItem>
                  <SelectItem value="WHOLESALE">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                disabled={!editing}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!editing}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!editing}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={!editing}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={!editing}
                rows={3}
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Units / Equipment</h2>
            <Button size="sm" onClick={() => setUnitDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Unit
            </Button>
          </div>
          <DataTable
            data={customerUnits}
            columns={unitColumns}
            searchable={false}
            onRowClick={(unit) => navigate(`/units/${unit.id}`)}
            emptyMessage="No units found for this customer"
          />
        </div>
      </div>

      <AddUnitDialog
        open={unitDialogOpen}
        onOpenChange={setUnitDialogOpen}
        customerId={id!}
        customerName={customer.company_name}
      />
    </div>
  );
}
