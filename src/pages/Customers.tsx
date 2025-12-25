import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRepos } from '@/data';
import type { Customer } from '@/types';
import { QuickAddDialog } from '@/components/ui/quick-add-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function Customers() {
  const navigate = useNavigate();
  const { customers, addCustomer } = useRepos().customers;
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  const columns: Column<Customer>[] = [
    { key: 'company_name', header: 'Company Name', sortable: true },
    { key: 'contact_name', header: 'Contact', sortable: true },
    { key: 'phone', header: 'Phone', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
  ];

  const handleSave = () => {
    if (!formData.company_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Company name is required',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate company name
    const exists = customers.some(
      (c) => c.company_name.toLowerCase() === formData.company_name.toLowerCase()
    );
    if (exists) {
      toast({
        title: 'Validation Error',
        description: 'A customer with this company name already exists',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate phone
    if (formData.phone) {
      const phoneExists = customers.some((c) => c.phone === formData.phone);
      if (phoneExists) {
        toast({
          title: 'Validation Error',
          description: 'A customer with this phone number already exists',
          variant: 'destructive',
        });
        return;
      }
    }

    addCustomer({
      company_name: formData.company_name.trim(),
      contact_name: formData.contact_name.trim() || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      address: formData.address.trim() || null,
      notes: formData.notes.trim() || null,
    });

    toast({
      title: 'Customer Created',
      description: `${formData.company_name} has been added`,
    });

    setDialogOpen(false);
    setFormData({
      company_name: '',
      contact_name: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    });
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Customers"
        subtitle="Manage your customer database"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        }
      />

      <DataTable
        data={customers.filter((c) => c.id !== 'walkin')}
        columns={columns}
        searchKeys={['company_name', 'contact_name', 'phone', 'email']}
        searchPlaceholder="Search customers..."
        onRowClick={(customer) => navigate(`/customers/${customer.id}`)}
        emptyMessage="No customers found. Add your first customer to get started."
      />

      <QuickAddDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Add New Customer"
        onSave={handleSave}
        onCancel={() => setDialogOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="company_name">Company Name *</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="Enter company name"
            />
          </div>
          <div>
            <Label htmlFor="contact_name">Contact Name</Label>
            <Input
              id="contact_name"
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              placeholder="Enter contact name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter address"
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Enter notes"
              rows={2}
            />
          </div>
        </div>
      </QuickAddDialog>
    </div>
  );
}
