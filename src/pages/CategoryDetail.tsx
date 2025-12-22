import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useShopStore } from '@/stores/shopStore';
import { useToast } from '@/hooks/use-toast';
import { Save, Edit, X, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function CategoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { categories, parts, updateCategory, deactivateCategory } = useShopStore();
  const { toast } = useToast();

  const category = categories.find((c) => c.id === id);
  const categoryParts = parts.filter((p) => p.category_id === id);
  const activeParts = categoryParts.filter((p) => p.is_active);

  const [isEditing, setIsEditing] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [formData, setFormData] = useState({
    category_name: '',
    description: '',
  });

  useEffect(() => {
    if (category) {
      setFormData({
        category_name: category.category_name,
        description: category.description || '',
      });
    }
  }, [category]);

  if (!category) {
    return (
      <div className="page-container">
        <PageHeader title="Category Not Found" backTo="/categories" />
        <p className="text-muted-foreground">This category does not exist.</p>
      </div>
    );
  }

  const handleSave = () => {
    if (!formData.category_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Category name is required',
        variant: 'destructive',
      });
      return;
    }

    updateCategory(id!, {
      category_name: formData.category_name.trim(),
      description: formData.description.trim() || null,
    });

    toast({
      title: 'Category Updated',
      description: `${formData.category_name} has been updated`,
    });
    setIsEditing(false);
  };

  const handleDeactivate = () => {
    deactivateCategory(id!);
    toast({
      title: 'Category Deactivated',
      description: `${category.category_name} has been deactivated`,
    });
    navigate('/categories');
  };

  const handleCancel = () => {
    setFormData({
      category_name: category.category_name,
      description: category.description || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="page-container">
      <PageHeader
        title={category.category_name}
        subtitle={category.is_active ? 'Active Category' : 'Inactive Category'}
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
                <p className="font-medium">{category.description || '-'}</p>
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
                      <TableCell>{part.description || '-'}</TableCell>
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
              This will deactivate "{category.category_name}". The category will no longer be selectable for new parts.
              This action can be undone by reactivating the category.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
