import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useRepos } from '@/repos';
import { useToast } from '@/hooks/use-toast';
import { Save, X, Trash2, Edit, Plus } from 'lucide-react';
import type { Technician, TechnicianCertification, TechnicianWorkSchedule } from '@/types';
import { TechnicianPerformanceTab } from '@/components/technicians/TechnicianPerformanceTab';

const SKILL_OPTIONS = [
  'Diagnostics',
  'Electrical',
  'Engine',
  'Transmission',
  'Hydraulics',
  'HVAC',
  'Brakes',
  'Suspension',
  'Welding',
  'Fabrication',
  'DOT Inspection',
  'PM/Service',
];

const DEFAULT_SCHEDULE: TechnicianWorkSchedule = {
  days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
  start_time: '07:00',
  end_time: '15:30',
};

type TechnicianFormData = {
  name: string;
  hourly_cost_rate: string;
  default_billable_rate: string;
  employment_type: Technician['employment_type'];
  skill_tags: string[];
  work_schedule: TechnicianWorkSchedule;
  certifications: TechnicianCertification[];
  is_active: boolean;
};

const buildSchedule = (schedule?: TechnicianWorkSchedule): TechnicianWorkSchedule => ({
  ...(schedule || DEFAULT_SCHEDULE),
  days: { ...(schedule?.days || DEFAULT_SCHEDULE.days) },
});

const buildFormData = (technician?: Technician): TechnicianFormData => ({
  name: technician?.name || '',
  hourly_cost_rate: technician?.hourly_cost_rate?.toString() || '',
  default_billable_rate: technician?.default_billable_rate?.toString() || '',
  employment_type: technician?.employment_type || 'HOURLY',
  skill_tags: technician?.skill_tags || [],
  work_schedule: buildSchedule(technician?.work_schedule),
  certifications: technician?.certifications ? technician.certifications.map((c) => ({ ...c })) : [],
  is_active: technician?.is_active ?? true,
});

const CERT_STATUS_COLORS = {
  expired: 'destructive',
  expiring: 'default',
  valid: 'secondary',
} as const;

export default function TechnicianDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { technicians, addTechnician, updateTechnician, deactivateTechnician } = useRepos().technicians;
  const { toast } = useToast();

  const isNew = id === 'new';
  const technician = !isNew ? technicians.find((t) => t.id === id) : null;

  const [editing, setEditing] = useState(isNew);
  const [formData, setFormData] = useState<TechnicianFormData>(buildFormData(technician || undefined));
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [newCertification, setNewCertification] = useState({ name: '', expires_on: '' });

  useEffect(() => {
    if (!isNew && technician) {
      setFormData(buildFormData(technician));
    }
  }, [isNew, technician]);

  const activeCertifications = useMemo(
    () => formData.certifications.filter((c) => c.is_active),
    [formData.certifications]
  );

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
      employment_type: formData.employment_type,
      skill_tags: formData.skill_tags,
      work_schedule: {
        ...formData.work_schedule,
        days: { ...formData.work_schedule.days },
      },
      certifications: formData.certifications,
      is_active: formData.is_active,
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

  const handleCancel = () => {
    if (!technician) return;
    setFormData(buildFormData(technician));
    setEditing(false);
  };

  const handleDeactivate = () => {
    deactivateTechnician(id!);
    toast({ title: 'Technician Deactivated' });
    navigate('/technicians');
  };

  const toggleSkill = (skill: string) => {
    if (!editing) return;
    setFormData((prev) => {
      const hasSkill = prev.skill_tags.includes(skill);
      const skill_tags = hasSkill ? prev.skill_tags.filter((s) => s !== skill) : [...prev.skill_tags, skill];
      return { ...prev, skill_tags };
    });
  };

  const toggleScheduleDay = (day: keyof TechnicianWorkSchedule['days']) => {
    if (!editing) return;
    setFormData((prev) => ({
      ...prev,
      work_schedule: {
        ...prev.work_schedule,
        days: { ...prev.work_schedule.days, [day]: !prev.work_schedule.days[day] },
      },
    }));
  };

  const addCertification = () => {
    if (!newCertification.name.trim() || !newCertification.expires_on) {
      toast({ title: 'Error', description: 'Certification name and expiration are required', variant: 'destructive' });
      return;
    }

    const newCert: TechnicianCertification = {
      id: crypto.randomUUID(),
      name: newCertification.name.trim(),
      expires_on: newCertification.expires_on,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setFormData((prev) => ({
      ...prev,
      certifications: [...prev.certifications, newCert],
    }));
    setNewCertification({ name: '', expires_on: '' });
    setCertDialogOpen(false);
  };

  const removeCertification = (certId: string) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.map((cert) =>
        cert.id === certId ? { ...cert, is_active: false, updated_at: new Date().toISOString() } : cert
      ),
    }));
  };

  const getCertStatus = (cert: TechnicianCertification) => {
    const expiresOn = new Date(cert.expires_on);
    if (Number.isNaN(expiresOn.getTime())) {
      return { label: 'Unknown', variant: 'secondary' as const };
    }

    const today = new Date();
    const msInDay = 1000 * 60 * 60 * 24;
    const diffDays = Math.floor((expiresOn.getTime() - today.getTime()) / msInDay);

    if (diffDays < 0) {
      return { label: 'Expired', variant: CERT_STATUS_COLORS.expired };
    }
    if (diffDays <= 30) {
      return { label: 'Expiring Soon', variant: CERT_STATUS_COLORS.expiring };
    }
    return { label: 'Valid', variant: CERT_STATUS_COLORS.valid };
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
                <Button variant="outline" onClick={handleCancel}>
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

      <Tabs defaultValue="profile" className="form-section">
        <TabsList className="mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          {!isNew && <TabsTrigger value="performance">Performance</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="space-y-4 max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!editing}
                placeholder="Technician name"
              />
            </div>
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <Select
                value={formData.employment_type}
                onValueChange={(value) => setFormData({ ...formData, employment_type: value as Technician['employment_type'] })}
                disabled={!editing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOURLY">Hourly</SelectItem>
                  <SelectItem value="SALARY">Salary</SelectItem>
                  <SelectItem value="CONTRACTOR">Contractor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label>Active</Label>
              <div className="flex h-10 items-center gap-3 rounded-md border px-3">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => editing && setFormData({ ...formData, is_active: !!checked })}
                  disabled={!editing}
                />
                <span className="text-sm text-muted-foreground">
                  {formData.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="skills" className="max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SKILL_OPTIONS.map((skill) => (
              <label
                key={skill}
                className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/50"
              >
                <Checkbox
                  checked={formData.skill_tags.includes(skill)}
                  onCheckedChange={() => toggleSkill(skill)}
                  disabled={!editing}
                />
                <span>{skill}</span>
              </label>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="certifications" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Active Certifications</h3>
              <p className="text-sm text-muted-foreground">Track technician credentials and expirations.</p>
            </div>
            <Dialog
              open={certDialogOpen}
              onOpenChange={(open) => {
                setCertDialogOpen(open);
                if (!open) setNewCertification({ name: '', expires_on: '' });
              }}
            >
              <DialogTrigger asChild>
                <Button disabled={!editing}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Certification
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Certification</DialogTitle>
                  <DialogDescription>Capture name and expiration date.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={newCertification.name}
                      onChange={(e) => setNewCertification({ ...newCertification, name: e.target.value })}
                      placeholder="Certification name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expires On</Label>
                    <Input
                      type="date"
                      value={newCertification.expires_on}
                      onChange={(e) => setNewCertification({ ...newCertification, expires_on: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCertDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addCertification}>Add</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeCertifications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    No active certifications
                  </TableCell>
                </TableRow>
              )}
              {activeCertifications.map((cert) => {
                const status = getCertStatus(cert);
                return (
                  <TableRow key={cert.id}>
                    <TableCell>{cert.name}</TableCell>
                    <TableCell>{cert.expires_on || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCertification(cert.id)}
                        disabled={!editing}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4 max-w-3xl">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Object.entries(formData.work_schedule.days).map(([day, value]) => (
              <label
                key={day}
                className="flex items-center gap-2 rounded-md border p-3 capitalize hover:bg-muted/50"
              >
                <Checkbox
                  checked={value}
                  onCheckedChange={() => toggleScheduleDay(day as keyof TechnicianWorkSchedule['days'])}
                  disabled={!editing}
                />
                {day}
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={formData.work_schedule.start_time}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    work_schedule: { ...formData.work_schedule, start_time: e.target.value },
                  })
                }
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={formData.work_schedule.end_time}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    work_schedule: { ...formData.work_schedule, end_time: e.target.value },
                  })
                }
                disabled={!editing}
              />
            </div>
          </div>
        </TabsContent>

        {!isNew && technician && (
          <TabsContent value="performance">
            <TechnicianPerformanceTab technician={technician} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
