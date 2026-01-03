import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
import { Save, X, Trash2, Edit } from 'lucide-react';
import { PMSection } from '@/components/pm/PMSection';

export default function UnitForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const repos = useRepos();
  const { units, addUnit, updateUnit, deactivateUnit } = repos.units;
  const { customers } = repos.customers;
  const { toast } = useToast();

  const isNew = id === 'new';
  const unit = !isNew ? units.find((u) => u.id === id) : null;
  const preselectedCustomer = searchParams.get('customer');

  const [editing, setEditing] = useState(isNew);
  const [formData, setFormData] = useState({
    customer_id: unit?.customer_id || preselectedCustomer || '',
    unit_name: unit?.unit_name || '',
    vin: unit?.vin || '',
    year: unit?.year?.toString() || '',
    make: unit?.make || '',
    model: unit?.model || '',
    mileage: unit?.mileage?.toString() || '',
    hours: unit?.hours?.toString() || '',
    notes: unit?.notes || '',
  });

  const activeCustomers = customers.filter((c) => c.is_active && c.id !== 'walkin');

  if (!isNew && !unit) {
    return (
      <div className="page-container">
        <PageHeader title="Unit Not Found" backTo="/units" />
        <p className="text-muted-foreground">This unit does not exist.</p>
      </div>
    );
  }

  const handleSave = () => {
    if (!formData.customer_id) {
      toast({
        title: 'Validation Error',
        description: 'Customer is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.unit_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Unit name is required',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate VIN
    if (formData.vin) {
      const vinExists = units.some(
        (u) => u.id !== id && u.vin?.toLowerCase() === formData.vin.toLowerCase()
      );
      if (vinExists) {
        toast({
          title: 'Validation Error',
          description: 'A unit with this VIN already exists',
          variant: 'destructive',
        });
        return;
      }
    }

    // Check for duplicate unit name per customer
    const nameExists = units.some(
      (u) =>
        u.id !== id &&
        u.customer_id === formData.customer_id &&
        u.unit_name.toLowerCase() === formData.unit_name.toLowerCase()
    );
    if (nameExists) {
      toast({
        title: 'Validation Error',
        description: 'This customer already has a unit with this name',
        variant: 'destructive',
      });
      return;
    }

    const unitData = {
      customer_id: formData.customer_id,
      unit_name: formData.unit_name.trim(),
      vin: formData.vin.trim() || null,
      year: formData.year ? parseInt(formData.year) : null,
      make: formData.make.trim() || null,
      model: formData.model.trim() || null,
      mileage: formData.mileage ? parseInt(formData.mileage) : null,
      hours: formData.hours ? parseInt(formData.hours) : null,
      notes: formData.notes.trim() || null,
    };

    if (isNew) {
      const newUnit = addUnit(unitData);
      toast({
        title: 'Unit Created',
        description: `${formData.unit_name} has been added`,
      });
      navigate(`/units/${newUnit.id}`);
    } else {
      updateUnit(id!, unitData);
      toast({
        title: 'Unit Updated',
        description: 'Changes have been saved',
      });
      setEditing(false);
    }
  };

  const handleDeactivate = () => {
    deactivateUnit(id!);
    toast({
      title: 'Unit Deactivated',
      description: 'Unit has been deactivated',
    });
    navigate('/units');
  };

  return (
    <div className="page-container">
      <PageHeader
        title={isNew ? 'New Unit' : unit?.unit_name || 'Unit'}
        subtitle={isNew ? 'Add a new unit' : unit?.is_active ? 'Active Unit' : 'Inactive Unit'}
        backTo="/units"
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
                {isNew ? 'Create Unit' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              {unit?.is_active && (
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
          <div>
            <Label htmlFor="customer_id">Customer *</Label>
            <Select
              value={formData.customer_id}
              onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
              disabled={!editing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {activeCustomers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="unit_name">Unit Name *</Label>
            <Input
              id="unit_name"
              value={formData.unit_name}
              onChange={(e) => setFormData({ ...formData, unit_name: e.target.value })}
              disabled={!editing}
              placeholder="e.g., Truck #101"
            />
          </div>

          <div>
            <Label htmlFor="vin">VIN</Label>
            <Input
              id="vin"
              value={formData.vin}
              onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
              disabled={!editing}
              placeholder="Vehicle Identification Number"
              className="font-mono"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                disabled={!editing}
                placeholder="2024"
              />
            </div>
            <div>
              <Label htmlFor="make">Make</Label>
              <Input
                id="make"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                disabled={!editing}
                placeholder="e.g., Peterbilt"
              />
            </div>
            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                disabled={!editing}
                placeholder="e.g., 389"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mileage">Mileage</Label>
              <Input
                id="mileage"
                type="number"
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
                disabled={!editing}
                placeholder="Enter mileage"
              />
            </div>
            <div>
              <Label htmlFor="hours">Engine Hours</Label>
              <Input
                id="hours"
                type="number"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                disabled={!editing}
                placeholder="Enter hours"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={!editing}
              rows={3}
              placeholder="Additional notes about this unit"
            />
          </div>
        </div>
      </div>

      {/* PM Section - only show for existing units */}
      {!isNew && unit && <PMSection unit={unit} />}
    </div>
  );
}

