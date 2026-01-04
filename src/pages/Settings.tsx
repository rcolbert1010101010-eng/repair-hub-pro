import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRepos } from '@/repos';
import { useToast } from '@/hooks/use-toast';
import { Save, Edit, X } from 'lucide-react';
import { useShopStore } from '@/stores/shopStore';

export default function Settings() {
  const { settings, updateSettings } = useRepos().settings;
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    shop_name: settings.shop_name,
    default_labor_rate: settings.default_labor_rate.toString(),
    default_tax_rate: settings.default_tax_rate.toString(),
    currency: settings.currency,
    units: settings.units,
    session_user_name: settings.session_user_name || '',
  });

  const hydrateForm = useCallback(() => {
    setFormData({
      shop_name: settings.shop_name,
      default_labor_rate: settings.default_labor_rate.toString(),
      default_tax_rate: settings.default_tax_rate.toString(),
      currency: settings.currency,
      units: settings.units,
      session_user_name: settings.session_user_name || '',
    });
  }, [settings]);

  useEffect(() => {
    if (!editing) {
      hydrateForm();
    }
  }, [settings, editing, hydrateForm]);

  const handleSave = async () => {
    if (!formData.shop_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Shop name is required',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      shop_name: formData.shop_name.trim(),
      default_labor_rate: parseFloat(formData.default_labor_rate) || 0,
      default_tax_rate: parseFloat(formData.default_tax_rate) || 0,
      currency: formData.currency,
      units: formData.units,
      session_user_name: formData.session_user_name.trim(),
    };

    try {
      await updateSettings(payload);
      toast({
        title: 'Settings Updated',
        description: 'Your changes have been saved',
      });
      setEditing(false);
    } catch (error) {
      useShopStore.getState().updateSettings(payload);
      if (typeof localStorage !== 'undefined') {
        const trimmed = payload.session_user_name.trim();
        if (trimmed) {
          localStorage.setItem('rhp.session_user_name', trimmed);
        } else {
          localStorage.removeItem('rhp.session_user_name');
        }
      }
      toast({
        title: 'Saved locally',
        description: 'Server unavailable — settings stored locally for this browser session.',
        variant: 'destructive',
      });
      setEditing(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Settings"
        subtitle="Configure shop settings and defaults"
        actions={
          editing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  hydrateForm();
                  setEditing(false);
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                hydrateForm();
                setEditing(true);
              }}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          )
        }
      />

      <div className="form-section max-w-xl">
        <h2 className="text-lg font-semibold mb-4">Shop Information</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="shop_name">Shop Name *</Label>
            <Input
              id="shop_name"
              value={formData.shop_name}
              onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
              disabled={!editing}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="default_labor_rate">Default Labor Rate ($/hr)</Label>
              <Input
                id="default_labor_rate"
                type="number"
                step="0.01"
                value={formData.default_labor_rate}
                onChange={(e) => setFormData({ ...formData, default_labor_rate: e.target.value })}
                disabled={!editing}
              />
            </div>
            <div>
              <Label htmlFor="default_tax_rate">Default Tax Rate (%)</Label>
              <Input
                id="default_tax_rate"
                type="number"
                step="0.01"
                value={formData.default_tax_rate}
                onChange={(e) => setFormData({ ...formData, default_tax_rate: e.target.value })}
                disabled={!editing}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
                disabled={!editing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="units">Units</Label>
              <Select
                value={formData.units}
                onValueChange={(value) => setFormData({ ...formData, units: value })}
                disabled={!editing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="imperial">Imperial (miles, gallons)</SelectItem>
                  <SelectItem value="metric">Metric (km, liters)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="session_user_name">Session User Name</Label>
            <Input
              id="session_user_name"
              value={formData.session_user_name}
              onChange={(e) => setFormData({ ...formData, session_user_name: e.target.value })}
              disabled={!editing}
              placeholder="Used for audit logging until auth is implemented"
            />
          </div>
        </div>
      </div>

      <div className="form-section max-w-xl mt-6">
        <h2 className="text-lg font-semibold mb-4">About</h2>
        <div className="text-sm text-muted-foreground space-y-2">
          <p><strong>ShopPro</strong> - Heavy-Duty Repair Shop Management System</p>
          <p>Operational Core Edition</p>
          <p className="text-xs mt-4">
            Note: Changes to labor rate only affect new labor lines. Existing labor lines retain their original rate.
          </p>
        </div>
      </div>
    </div>
  );
}
