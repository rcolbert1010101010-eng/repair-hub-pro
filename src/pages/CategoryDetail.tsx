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
import type { PartCategory, Part } from "@/types";
import { fetchCategoryById, updateCategoryById, deactivateCategoryById, fetchParts } from "@/integrations/supabase/catalog";

export default function CategoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [category, setCategory] = useState<PartCategory | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [formData, setFormData] = useState({
    category_name: "",
    description: "",
  });

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setLoading(true);
        setLoadError(null);

        if (!id) throw new Error("Missing category id");

        const [c, p] = await Promise.all([fetchCategoryById(id), fetchParts()]);
        if (!isMounted) return;

        setCategory(c);
        setParts(p);

        if (c) {
          setFormData({
            category_name: c.category_name,
            description: c.description || "",
          });
        }
      } catch (e: any) {
        if (!isMounted) return;
        setLoadError(e?.message ?? "Failed to load category");
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const categoryParts = useMemo(() => parts.filter((p) => p.category_id === id), [parts, id]);
  const activeParts = useMemo(() => categoryParts.filter((p) => p.is_active), [categoryParts]);

  const handleSave = async () => {
    if (!id) return;

    if (!formData.category_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const updated = await updateCategoryById(id, {
        category_name: formData.category_name.trim(),
        description: formData.description.trim() || null,
      });

      setCategory(updated);

      toast({
        title: "Category Updated",
        description: `${formData.category_name.trim()} has been updated`,
      });

      setIsEditing(false);
    } catch (e: any) {
      toast({
        title: "Update failed",
        description: e?.message ?? "Unable to update category",
        variant: "destructive",
      });
    }
  };

  const handleDeactivate = async () => {
    if (!id || !category) return;

    try {
      await deactivateCategoryById(id);
      toast({
        title: "Category Deactivated",
        description: `${category.category_name} has been deactivated`,
      });
      navigate("/categories");
    } catch (e: any) {
      toast({
        title: "Deactivate failed",
        description: e?.message ?? "Unable to deactivate category",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    if (!category) return;
    setFormData({
      category_name: category.category_name,
      description: category.description || "",
    });
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="Category" backTo="/categories" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page-container">
        <PageHeader title="Category" backTo="/categories" />
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <div className="font-medium">Failed to load category</div>
          <div className="opacity-80 mt-1">{loadError}</div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="page-container">
        <PageHeader title="Category Not Found" backTo="/categories" />
        <p className="text-muted-foreground">This category does not exist.</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title={category.category_name}
        subtitle={category.is_active ? "Active Category" : "Inactive Category"}
        backTo="/categories"
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
                {category.is_active && (
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
        {/* Category Information */}
        <div className="form-section">
          <h2 className="text-lg font-semibold mb-4">Category Information</h2>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="category_name">Category Name *</Label>
                <Input
                  id="category_name"
                  value={formData.category_name}
                  onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Description:</span>
                <p className="font-medium">{category.description || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>
                <p className="font-medium">{new Date(category.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Related Parts */}
        <div className="form-section">
          <h2 className="text-lg font-semibold mb-4">Parts in this Category ({activeParts.length})</h2>
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
                      No parts in this category
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
            <AlertDialogTitle>Deactivate Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate "{category.category_name}". The category will no longer be selectable for new parts. This action can
              be undone by reactivating the category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
