import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useRepos } from '@/repos';
import { useToast } from '@/hooks/use-toast';
import { Edit, Save, X, Trash2, Plus } from 'lucide-react';
import { DataTable, Column } from '@/components/ui/data-table';
import { AddUnitDialog } from '@/components/units/AddUnitDialog';
import type { Unit, PaymentTerms, PreferredContactMethod } from '@/types';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const repos = useRepos();
  const { customers, updateCustomer, deactivateCustomer } = repos.customers;
  const { units } = repos.units;
  const { getCustomerContacts, createCustomerContact, setPrimaryCustomerContact } = repos.customerContacts;
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    role: '',
    phone: '',
    email: '',
    preferred_method: '' as PreferredContactMethod | '',
    is_primary: false,
  });

  const customer = customers.find((c) => c.id === id);
  const customerUnits = units.filter((u) => u.customer_id === id);
  const contacts = repos.customerContacts.getCustomerContacts(id!);

  const [formData, setFormData] = useState({
    company_name: customer?.company_name || '',
    contact_name: customer?.contact_name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    notes: customer?.notes || '',
    price_level: customer?.price_level || 'RETAIL',
    is_tax_exempt: customer?.is_tax_exempt ?? false,
    tax_rate_override: customer?.tax_rate_override?.toString() || '',
    payment_terms: (customer?.payment_terms as PaymentTerms) || 'COD',
    credit_limit: customer?.credit_limit?.toString() || '',
    credit_hold: customer?.credit_hold ?? false,
    credit_hold_reason: customer?.credit_hold_reason || '',
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

    if (formData.credit_hold && !formData.credit_hold_reason.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Credit hold reason is required',
        variant: 'destructive',
      });
      return;
    }

    const creditLimitValue =
      formData.credit_limit.trim() === ''
        ? null
        : Number.isFinite(parseFloat(formData.credit_limit))
        ? parseFloat(formData.credit_limit)
        : null;

    updateCustomer(id!, {
      company_name: formData.company_name.trim(),
      contact_name: formData.contact_name.trim() || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      address: formData.address.trim() || null,
      notes: formData.notes.trim() || null,
      price_level: formData.price_level,
      is_tax_exempt: formData.is_tax_exempt,
      tax_rate_override:
        formData.tax_rate_override.trim() === ''
          ? null
          : Number.isFinite(parseFloat(formData.tax_rate_override))
          ? parseFloat(formData.tax_rate_override)
          : null,
      payment_terms: formData.payment_terms as PaymentTerms,
      credit_limit: creditLimitValue,
      credit_hold: formData.credit_hold,
      credit_hold_reason: formData.credit_hold ? formData.credit_hold_reason.trim() || null : null,
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

  const resetContactForm = () =>
    setContactForm({
      name: '',
      role: '',
      phone: '',
      email: '',
      preferred_method: '' as PreferredContactMethod | '',
      is_primary: false,
    });

  const handleSaveContact = () => {
    if (!contactForm.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Contact name is required',
        variant: 'destructive',
      });
      return;
    }

    const result = createCustomerContact(id!, {
      name: contactForm.name.trim(),
      role: contactForm.role.trim() || null,
      phone: contactForm.phone.trim() || null,
      email: contactForm.email.trim() || null,
      preferred_method: (contactForm.preferred_method as PreferredContactMethod) || null,
      is_primary: contactForm.is_primary,
    });

    if (!result.success) {
      toast({
        title: 'Could not add contact',
        description: result.error || 'Unknown error',
        variant: 'destructive',
      });
      return;
    }

    if (contactForm.is_primary && result.contact?.id) {
      setPrimaryCustomerContact(id!, result.contact.id);
    }

    toast({
      title: 'Contact Added',
      description: 'New contact has been saved',
    });
    resetContactForm();
    setContactDialogOpen(false);
  };

  const handleMakePrimary = (contactId: string) => {
    setPrimaryCustomerContact(id!, contactId);
    toast({
      title: 'Primary Contact Set',
      description: 'Primary contact updated',
    });
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

      {!editing && customer.credit_hold && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Customer is on Credit Hold</AlertTitle>
          <AlertDescription>
            {customer.credit_hold_reason || 'No reason provided.'}
          </AlertDescription>
        </Alert>
      )}

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
                onValueChange={(value) => setFormData({ ...formData, price_level: value as 'RETAIL'|'FLEET'|'WHOLESALE' })}
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
              <Label>Payment Terms</Label>
              <Select
                value={formData.payment_terms}
                onValueChange={(value) => setFormData({ ...formData, payment_terms: value as PaymentTerms })}
                disabled={!editing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COD">COD</SelectItem>
                  <SelectItem value="NET_15">Net 15</SelectItem>
                  <SelectItem value="NET_30">Net 30</SelectItem>
                  <SelectItem value="NET_45">Net 45</SelectItem>
                  <SelectItem value="NET_60">Net 60</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Credit Limit</Label>
              <Input
                type="number"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                disabled={!editing}
                placeholder="e.g., 5000"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="credit_hold"
                checked={formData.credit_hold}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    credit_hold: Boolean(checked),
                    credit_hold_reason: checked ? prev.credit_hold_reason : '',
                  }))
                }
                disabled={!editing}
              />
              <Label htmlFor="credit_hold" className="font-medium">
                Credit Hold
              </Label>
            </div>
            {formData.credit_hold && (
              <div>
                <Label htmlFor="credit_hold_reason">Credit Hold Reason *</Label>
                <Textarea
                  id="credit_hold_reason"
                  value={formData.credit_hold_reason}
                  onChange={(e) => setFormData({ ...formData, credit_hold_reason: e.target.value })}
                  disabled={!editing}
                  rows={2}
                  placeholder="Enter reason for hold"
                />
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_tax_exempt"
                checked={formData.is_tax_exempt}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_tax_exempt: Boolean(checked) })
                }
                disabled={!editing}
              />
              <Label htmlFor="is_tax_exempt" className="font-medium">
                Tax Exempt
              </Label>
            </div>
            <div>
              <Label htmlFor="tax_rate_override">Tax Rate Override (%)</Label>
              <Input
                id="tax_rate_override"
                type="number"
                step="0.01"
                value={formData.tax_rate_override}
                onChange={(e) => setFormData({ ...formData, tax_rate_override: e.target.value })}
                disabled={!editing || formData.is_tax_exempt}
                placeholder="e.g., 8.25"
              />
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

      <div className="form-section mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Contacts</h2>
          <Button
            size="sm"
            onClick={() => {
              resetContactForm();
              setContactDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
        </div>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Preferred</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No contacts yet
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      {contact.name}
                      {contact.is_primary && <Badge variant="secondary">Primary</Badge>}
                    </TableCell>
                    <TableCell>{contact.role || '—'}</TableCell>
                    <TableCell>{contact.phone || '—'}</TableCell>
                    <TableCell>{contact.email || '—'}</TableCell>
                    <TableCell>{contact.preferred_method || '—'}</TableCell>
                    <TableCell className="text-right">
                      {!contact.is_primary && (
                        <Button size="sm" variant="outline" onClick={() => handleMakePrimary(contact.id)}>
                          Make Primary
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

      <AddUnitDialog
        open={unitDialogOpen}
        onOpenChange={setUnitDialogOpen}
        customerId={id!}
        customerName={customer.company_name}
      />

      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>Contact information for this customer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input
                  value={contactForm.name}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Role</Label>
                <Input
                  value={contactForm.role}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, role: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input
                  value={contactForm.phone}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Preferred Method</Label>
                <Select
                  value={contactForm.preferred_method || undefined}
                  onValueChange={(value: PreferredContactMethod) =>
                    setContactForm((prev) => ({ ...prev, preferred_method: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHONE">Phone</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="TEXT">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="is_primary_contact"
                  checked={contactForm.is_primary}
                  onCheckedChange={(checked) =>
                    setContactForm((prev) => ({ ...prev, is_primary: Boolean(checked) }))
                  }
                />
                <Label htmlFor="is_primary_contact">Primary Contact</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetContactForm();
                setContactDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveContact}>Save Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
