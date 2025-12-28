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
import { useToast } from '@/hooks/use-toast';
import { useShopStore } from '@/stores/shopStore';
import type { UnitPMSchedule } from '@/types';
import { format } from 'date-fns';

interface MarkPMCompletedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: UnitPMSchedule | null;
  currentMeter: number | null;
}

export function MarkPMCompletedDialog({
  open,
  onOpenChange,
  schedule,
  currentMeter,
}: MarkPMCompletedDialogProps) {
  const { toast } = useToast();
  const { markPMCompleted } = useShopStore();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    completed_date: format(new Date(), 'yyyy-MM-dd'),
    completed_meter: '',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        completed_date: format(new Date(), 'yyyy-MM-dd'),
        completed_meter: currentMeter?.toString() || '',
        notes: '',
      });
    }
  }, [open, currentMeter]);

  if (!schedule) return null;

  const showMeterField = schedule.interval_type === 'MILES' || schedule.interval_type === 'HOURS';

  const handleSave = () => {
    if (!formData.completed_date) {
      toast({ title: 'Validation Error', description: 'Completed date is required', variant: 'destructive' });
      return;
    }

    const meterValue = formData.completed_meter ? parseInt(formData.completed_meter) : null;
    
    if (showMeterField && (meterValue === null || meterValue < 0)) {
      toast({
        title: 'Validation Error',
        description: `${schedule.interval_type === 'MILES' ? 'Mileage' : 'Hours'} is required for this PM type`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const result = markPMCompleted(
        schedule.id,
        formData.completed_date,
        meterValue,
        formData.notes.trim() || null
      );

      if (result.success) {
        toast({ title: 'PM Marked Complete', description: `${schedule.name} has been marked as completed` });
        onOpenChange(false);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to mark PM complete', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark "{schedule.name}" Complete</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="completed_date">Completed Date *</Label>
            <Input
              id="completed_date"
              type="date"
              value={formData.completed_date}
              onChange={(e) => setFormData({ ...formData, completed_date: e.target.value })}
            />
          </div>

          {showMeterField && (
            <div>
              <Label htmlFor="completed_meter">
                {schedule.interval_type === 'MILES' ? 'Current Mileage' : 'Current Hours'} *
              </Label>
              <Input
                id="completed_meter"
                type="number"
                value={formData.completed_meter}
                onChange={(e) => setFormData({ ...formData, completed_meter: e.target.value })}
                placeholder={schedule.interval_type === 'MILES' ? 'e.g., 250000' : 'e.g., 4000'}
                min="0"
              />
            </div>
          )}

          <div>
            <Label htmlFor="completion_notes">Notes</Label>
            <Textarea
              id="completion_notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Optional notes about this completion"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Mark Complete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
