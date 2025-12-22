import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Vendor } from "@/types";
import { QuickAddDialog } from "@/components/ui/quick-add-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createVendor, fetchVendors } from "@/integrations/supabase/catalog";

export default function Vendors() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: "",
    phone: "",
    email: "",
    notes: "",
  });

  async function refreshVendors() {
    const v = await fetchVendors();
    setVendors(v);
  }

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const v = await fetchVendors();
        if (!isMounted) return;
        setVendors(v);
      } catch (e: any) {
        if (!isMounted) return;
        setLoadError(e?.message ?? "Failed to load vendors from Supabase");
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const columns: Column<Vendor>[] = [
    { key: "vendor_name", header: "Vendor Name", sortable: true },
    { key: "phone", header: "Phone", sortable: true },
    { key: "email", header: "Email", sortable: true },
  ];

  const handleSave = async () => {
    if (!formData.vendor_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Vendor name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await createVendor({
        vendor_name: formData.vendor_name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        notes: formData.notes.trim() || null,
      });

      toast({
        title: "Vendor Created",
        description: `${formData.vendor_name.trim()} has been added`,
      });

      setDialogOpen(false);
      setFormData({ vendor_name: "", phone: "", email: "", notes: "" });

      await refreshVendors();
    } catch (e: any) {
      toast({
        title: "Create failed",
        description: e?.message ?? "Unable to create vendor",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Vendors"
        subtitle="Manage your parts vendors"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor
          </Button>
        }
      />

      {loadError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <div className="font-medium">Failed to load vendors</div>
          <div className="opacity-80 mt-1">{loadError}</div>
        </div>
      ) : (
        <DataTable
          data={vendors}
          columns={columns}
          searchKeys={["vendor_name", "phone", "email"]}
          searchPlaceholder={loading ? "Loading vendors..." : "Search vendors..."}
          onRowClick={(vendor) => navigate(`/vendors/${vendor.id}`)}
          emptyMessage={loading ? "Loading..." : "No vendors found. Add your first vendor to get started."}
        />
      )}

      <QuickAddDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Add New Vendor"
        onSave={handleSave}
        onCancel={() => setDialogOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="vendor_name">Vendor Name *</Label>
            <Input
              id="vendor_name"
              value={formData.vendor_name}
              onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
              placeholder="Enter vendor name"
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
