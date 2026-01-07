import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useShopStore } from '@/stores/shopStore';
import type { UnitPMSchedule, PMIntervalType } from '@/types';

interface PMScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string;
  schedule?: UnitPMSchedule | null;
}

export function PMScheduleDialog({
  open,
  onOpenChange,
  unitId,
  schedule,
}: PMScheduleDialogProps) {
  const { toast } = useToast();
  const { addPMSchedule, updatePMSchedule } = useShopStore();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    interval_type: 'MILES' as PMIntervalType,
    interval_value: '',
    last_completed_date: '',
    last_completed_meter: '',
    default_labor_description: '',
    default_labor_hours: '',
    notes: '',
  });

  useEffect(() => {
    if (schedule) {
      setFormData({
        name: schedule.name,
        interval_type: schedule.interval_type,
        interval_value: schedule.interval_value.toString(),
        last_completed_date: schedule.last_completed_date || '',
        last_completed_meter: schedule.last_completed_meter?.toString() || '',
        default_labor_description: schedule.default_labor_description ?? '',
        default_labor_hours: schedule.default_labor_hours?.toString() ?? '',
        notes: schedule.notes || '',
      });
    } else {
      setFormData({
        name: '',
        interval_type: 'MILES',
        interval_value: '',
        last_completed_date: '',
        last_completed_meter: '',
        default_labor_description: '',
        default_labor_hours: '',
        notes: '',
      });
    }
  }, [schedule, open]);

  const handleSave = () => {
    // Validation
    if (!formData.name.trim()) {
      toast({ title: 'Validation Error', description: 'Name is required', variant: 'destructive' });
      return;
    }

    const intervalValue = parseInt(formData.interval_value);
    if (!intervalValue || intervalValue <= 0) {
      toast({ title: 'Validation Error', description: 'Interval value must be a positive number', variant: 'destructive' });
      return;
    }

    const lastMeter = formData.last_completed_meter ? parseInt(formData.last_completed_meter) : null;
    if (lastMeter !== null && lastMeter < 0) {
      toast({ title: 'Validation Error', description: 'Last completed meter must be a positive number', variant: 'destructive' });
      return;
    }

    const defaultHours = formData.default_labor_hours ? parseFloat(formData.default_labor_hours) : null;
    if (defaultHours !== null && defaultHours <= 0) {
      toast({ title: 'Validation Error', description: 'Default labor hours must be greater than 0', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const data = {
        unit_id: unitId,
        name: formData.name.trim(),
        interval_type: formData.interval_type,
        interval_value: intervalValue,
        last_completed_date: formData.last_completed_date || null,
        last_completed_meter: lastMeter,
        default_labor_description: formData.default_labor_description.trim() || null,
        default_labor_hours: defaultHours,
        notes: formData.notes.trim() || null,
        last_generated_due_key: null,
        last_generated_work_order_id: null,
      };

      if (schedule) {
        updatePMSchedule(schedule.id, data);
        toast({ title: 'PM Schedule Updated', description: `${data.name} has been updated` });
      } else {
        addPMSchedule(data);
        toast({ title: 'PM Schedule Created', description: `${data.name} has been added` });
      }

      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save PM schedule', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const showMeterField = formData.interval_type === 'MILES' || formData.interval_type === 'HOURS';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{schedule ? 'Edit PM Schedule' : 'Add PM Schedule'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="pm_name">Name *</Label>
            <Input
              id="pm_name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., PM A, Oil Change, DOT Annual"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="interval_type">Interval Type *</Label>
              <Select
                value={formData.interval_type}
                onValueChange={(value: PMIntervalType) =>
                  setFormData({ ...formData, interval_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MILES">Miles</SelectItem>
                  <SelectItem value="HOURS">Hours</SelectItem>
                  <SelectItem value="DAYS">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="interval_value">Interval Value *</Label>
              <Input
                id="interval_value"
                type="number"
                value={formData.interval_value}
                onChange={(e) => setFormData({ ...formData, interval_value: e.target.value })}
                placeholder={formData.interval_type === 'DAYS' ? 'e.g., 180' : 'e.g., 5000'}
                min="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="last_completed_date">Last Completed Date</Label>
              <Input
                id="last_completed_date"
                type="date"
                value={formData.last_completed_date}
                onChange={(e) => setFormData({ ...formData, last_completed_date: e.target.value })}
              />
            </div>
            {showMeterField && (
              <div>
                <Label htmlFor="last_completed_meter">
                  Last Completed {formData.interval_type === 'MILES' ? 'Mileage' : 'Hours'}
                </Label>
                <Input
                  id="last_completed_meter"
                  type="number"
                  value={formData.last_completed_meter}
                  onChange={(e) => setFormData({ ...formData, last_completed_meter: e.target.value })}
                  placeholder={formData.interval_type === 'MILES' ? 'e.g., 245000' : 'e.g., 3500'}
                  min="0"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="default_labor_description">Default Labor Description</Label>
              <Input
                id="default_labor_description"
                value={formData.default_labor_description}
                onChange={(e) => setFormData({ ...formData, default_labor_description: e.target.value })}
                placeholder="e.g., Preventive Maintenance - PM A"
              />
            </div>
            <div>
              <Label htmlFor="default_labor_hours">Default Labor Hours</Label>
              <Input
                id="default_labor_hours"
                type="number"
                step="0.1"
                min="0.1"
                value={formData.default_labor_hours}
                onChange={(e) => setFormData({ ...formData, default_labor_hours: e.target.value })}
                placeholder="e.g., 1.0"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="pm_notes">Notes</Label>
            <Textarea
              id="pm_notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Optional notes"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : schedule ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
