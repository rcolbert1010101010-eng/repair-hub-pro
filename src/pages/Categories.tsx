import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { PartCategory } from "@/types";
import { QuickAddDialog } from "@/components/ui/quick-add-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createCategory, fetchCategories } from "@/integrations/supabase/catalog";

export default function Categories() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [categories, setCategories] = useState<PartCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    category_name: "",
    description: "",
  });

  async function refreshCategories() {
    const c = await fetchCategories();
    setCategories(c);
  }

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const c = await fetchCategories();
        if (!isMounted) return;
        setCategories(c);
      } catch (e: any) {
        if (!isMounted) return;
        setLoadError(e?.message ?? "Failed to load categories from Supabase");
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const columns: Column<PartCategory>[] = [
    { key: "category_name", header: "Category Name", sortable: true },
    { key: "description", header: "Description", sortable: true },
  ];

  const handleSave = async () => {
    if (!formData.category_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await createCategory({
        category_name: formData.category_name.trim(),
        description: formData.description.trim() || null,
      });

      toast({
        title: "Category Created",
        description: `${formData.category_name.trim()} has been added`,
      });

      setDialogOpen(false);
      setFormData({ category_name: "", description: "" });

      await refreshCategories();
    } catch (e: any) {
      toast({
        title: "Create failed",
        description: e?.message ?? "Unable to create category",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Part Categories"
        subtitle="Organize your inventory by category"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
        }
      />

      {loadError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <div className="font-medium">Failed to load categories</div>
          <div className="opacity-80 mt-1">{loadError}</div>
        </div>
      ) : (
        <DataTable
          data={categories}
          columns={columns}
          searchKeys={["category_name", "description"]}
          searchPlaceholder={loading ? "Loading categories..." : "Search categories..."}
          onRowClick={(category) => navigate(`/categories/${category.id}`)}
          emptyMessage={loading ? "Loading..." : "No categories found. Add your first category to get started."}
        />
      )}

      <QuickAddDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Add New Category"
        onSave={handleSave}
        onCancel={() => setDialogOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="category_name">Category Name *</Label>
            <Input
              id="category_name"
              value={formData.category_name}
              onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
              placeholder="Enter category name"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter description"
              rows={2}
            />
          </div>
        </div>
      </QuickAddDialog>
    </div>
  );
}
