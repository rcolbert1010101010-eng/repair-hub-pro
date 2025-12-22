import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, Edit, X, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Vendor, Part } from "@/types";
import { fetchVendorById, updateVendorById, deactivateVendorById, fetchParts } from "@/integrations/supabase/catalog";

export default function VendorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: "",
    phone: "",
    email: "",
    notes: "",
  });

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setLoading(true);
        setLoadError(null);

        if (!id) throw new Error("Missing vendor id");

        const [v, p] = await Promise.all([fetchVendorById(id), fetchParts()]);
        if (!isMounted) return;

        setVendor(v);
        setParts(p);

        if (v) {
          setFormData({
            vendor_name: v.vendor_name,
            phone: v.phone || "",
            email: v.email || "",
            notes: v.notes || "",
          });
        }
      } catch (e: any) {
        if (!isMounted) return;
        setLoadError(e?.message ?? "Failed to load vendor");
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const vendorParts = useMemo(() => parts.filter((p) => p.vendor_id === id), [parts, id]);
  const activeParts = useMemo(() => vendorParts.filter((p) => p.is_active), [vendorParts]);

  const handleSave = async () => {
    if (!id) return;

    if (!formData.vendor_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Vendor name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const updated = await updateVendorById(id, {
        vendor_name: formData.vendor_name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        notes: formData.notes.trim() || null,
      });

      setVendor(updated);

      toast({
        title: "Vendor Updated",
        description: `${formData.vendor_name.trim()} has been updated`,
      });

      setIsEditing(false);
    } catch (e: any) {
      toast({
        title: "Update failed",
        description: e?.message ?? "Unable to update vendor",
        variant: "destructive",
      });
    }
  };

  const handleDeactivate = async () => {
    if (!id || !vendor) return;

    try {
      await deactivateVendorById(id);
      toast({
        title: "Vendor Deactivated",
        description: `${vendor.vendor_name} has been deactivated`,
      });
      navigate("/vendors");
    } catch (e: any) {
      toast({
        title: "Deactivate failed",
        description: e?.message ?? "Unable to deactivate vendor",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    if (!vendor) return;
    setFormData({
      vendor_name: vendor.vendor_name,
      phone: vendor.phone || "",
      email: vendor.email || "",
      notes: vendor.notes || "",
    });
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="Vendor" backTo="/vendors" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page-container">
        <PageHeader title="Vendor" backTo="/vendors" />
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <div className="font-medium">Failed to load vendor</div>
          <div className="opacity-80 mt-1">{loadError}</div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="page-container">
        <PageHeader title="Vendor Not Found" backTo="/vendors" />
        <p className="text-muted-foreground">This vendor does not exist.</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title={vendor.vendor_name}
        subtitle={vendor.is_active ? "Active Vendor" : "Inactive Vendor"}
        backTo="/vendors"
        actions={
          <>
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
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
                {vendor.is_active && (
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setShowDeactivateDialog(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Deactivate
                  </Button>
                )}
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendor Information */}
        <div className="form-section">
          <h2 className="text-lg font-semibold mb-4">Vendor Information</h2>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="vendor_name">Vendor Name *</Label>
                <Input
                  id="vendor_name"
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Phone:</span>
                <p className="font-medium">{vendor.phone || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{vendor.email || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Notes:</span>
                <p className="font-medium">{vendor.notes || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>
                <p className="font-medium">{new Date(vendor.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Related Parts */}
        <div className="form-section">
          <h2 className="text-lg font-semibold mb-4">Parts from this Vendor ({activeParts.length})</h2>
          <div className="table-container max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">QOH</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeParts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No parts from this vendor
                    </TableCell>
                  </TableRow>
                ) : (
                  activeParts.map((part) => (
                    <TableRow
                      key={part.id}
                      className="cursor-pointer hover:bg-secondary/50"
                      onClick={() => navigate(`/inventory/${part.id}`)}
                    >
                      <TableCell className="font-mono">{part.part_number}</TableCell>
                      <TableCell>{part.description || "-"}</TableCell>
                      <TableCell className="text-right">{part.quantity_on_hand}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the vendor as inactive. You can keep historical records, but the vendor will no longer appear in pickers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeactivate}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
