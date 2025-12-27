import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRepos } from '@/repos';
import { useToast } from '@/hooks/use-toast';
import { Save, X, Trash2, Edit } from 'lucide-react';

export default function TechnicianDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { technicians, addTechnician, updateTechnician, deactivateTechnician } = useRepos().technicians;
  const { toast } = useToast();

  const isNew = id === 'new';
  const technician = !isNew ? technicians.find((t) => t.id === id) : null;

  const [editing, setEditing] = useState(isNew);
  const [formData, setFormData] = useState({
    name: technician?.name || '',
    hourly_cost_rate: technician?.hourly_cost_rate?.toString() || '',
    default_billable_rate: technician?.default_billable_rate?.toString() || '',
  });

  if (!isNew && !technician) {
    return (
      <div className="page-container">
        <PageHeader title="Technician Not Found" backTo="/technicians" />
        <p className="text-muted-foreground">This technician does not exist.</p>
      </div>
    );
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }
    if (!formData.hourly_cost_rate) {
      toast({ title: 'Error', description: 'Hourly cost rate is required', variant: 'destructive' });
      return;
    }

    const data = {
      name: formData.name.trim(),
      hourly_cost_rate: parseFloat(formData.hourly_cost_rate) || 0,
      default_billable_rate: formData.default_billable_rate ? parseFloat(formData.default_billable_rate) : null,
    };

    if (isNew) {
      const newTech = addTechnician(data);
      toast({ title: 'Technician Added', description: `${data.name} has been added` });
      navigate(`/technicians/${newTech.id}`);
    } else {
      updateTechnician(id!, data);
      toast({ title: 'Technician Updated' });
      setEditing(false);
    }
  };

  const handleDeactivate = () => {
    deactivateTechnician(id!);
    toast({ title: 'Technician Deactivated' });
    navigate('/technicians');
  };

  return (
    <div className="page-container">
      <PageHeader
        title={isNew ? 'New Technician' : technician?.name || 'Technician'}
        backTo="/technicians"
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
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              {technician?.is_active && (
                <Button variant="destructive" onClick={handleDeactivate}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Deactivate
                </Button>
              )}
            </>
          )
        }
      />

      <div className="form-section max-w-xl">
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={!editing}
              placeholder="Technician name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Hourly Cost Rate *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.hourly_cost_rate}
                onChange={(e) => setFormData({ ...formData, hourly_cost_rate: e.target.value })}
                disabled={!editing}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Default Billable Rate</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.default_billable_rate}
                onChange={(e) => setFormData({ ...formData, default_billable_rate: e.target.value })}
                disabled={!editing}
                placeholder="Optional"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
