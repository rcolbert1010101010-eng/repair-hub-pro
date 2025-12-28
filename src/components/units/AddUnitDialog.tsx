import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useShopStore } from '@/stores/shopStore';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

interface AddUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
}

export function AddUnitDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
}: AddUnitDialogProps) {
  const { units, addUnit } = useShopStore();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    unit_name: '',
    vin: '',
    year: '',
    make: '',
    model: '',
    mileage: '',
    hours: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      unit_name: '',
      vin: '',
      year: '',
      make: '',
      model: '',
      mileage: '',
      hours: '',
      notes: '',
    });
  };

  const handleSave = () => {
    if (!formData.unit_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Unit name is required',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate VIN (globally unique)
    if (formData.vin) {
      const vinExists = units.some(
        (u) => u.vin?.toLowerCase() === formData.vin.toLowerCase()
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
        u.customer_id === customerId &&
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
      customer_id: customerId,
      unit_name: formData.unit_name.trim(),
      vin: formData.vin.trim() || null,
      year: formData.year ? parseInt(formData.year) : null,
      make: formData.make.trim() || null,
      model: formData.model.trim() || null,
      mileage: formData.mileage ? parseInt(formData.mileage) : null,
      hours: formData.hours ? parseInt(formData.hours) : null,
      notes: formData.notes.trim() || null,
    };

    addUnit(unitData);

    toast({
      title: 'Unit Created',
      description: `${formData.unit_name} has been added to ${customerName}`,
    });

    resetForm();
    onOpenChange(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Unit</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Adding unit for <span className="font-medium">{customerName}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="unit_name">Unit Name *</Label>
            <Input
              id="unit_name"
              value={formData.unit_name}
              onChange={(e) => setFormData({ ...formData, unit_name: e.target.value })}
              placeholder="e.g., Truck #101"
            />
          </div>

          <div>
            <Label htmlFor="vin">VIN</Label>
            <Input
              id="vin"
              value={formData.vin}
              onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
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
                placeholder="2024"
              />
            </div>
            <div>
              <Label htmlFor="make">Make</Label>
              <Input
                id="make"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                placeholder="e.g., Peterbilt"
              />
            </div>
            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
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
              rows={2}
              placeholder="Additional notes about this unit"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Create Unit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
