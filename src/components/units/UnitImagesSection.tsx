import { useState, useRef, useCallback, useMemo } from 'react';
import { useRepos } from '@/repos';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ImagePlus,
  Star,
  Trash2,
  Eye,
  GripVertical,
  Upload,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type { UnitAttachment, UnitAttachmentTag } from '@/types';

interface UploadQueueItem {
  id: string;
  file: File;
  status: 'queued' | 'uploading' | 'done' | 'failed';
  error?: string;
}

interface UnitImagesSectionProps {
  unitId: string;
}

const TAG_LABELS: Record<UnitAttachmentTag, string> = {
  BEFORE: 'Before',
  AFTER: 'After',
  GENERAL: 'General',
};

const TAG_COLORS: Record<UnitAttachmentTag, string> = {
  BEFORE: 'bg-amber-100 text-amber-800 border-amber-300',
  AFTER: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  GENERAL: 'bg-slate-100 text-slate-800 border-slate-300',
};

export function UnitImagesSection({ unitId }: UnitImagesSectionProps) {
  const repos = useRepos();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<UnitAttachment | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<UnitAttachment | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const attachments = repos.unitAttachments.list(unitId);

  const sortedAttachments = useMemo(() => {
    return [...attachments].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return a.sort_order - b.sort_order;
    });
  }, [attachments]);

  const processUploadQueue = useCallback(
    async (files: File[]) => {
      const maxSize = 10 * 1024 * 1024;
      const queue: UploadQueueItem[] = files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        status: file.size > maxSize ? 'failed' : 'queued',
        error: file.size > maxSize ? 'File too large (max 10MB)' : undefined,
      }));

      setUploadQueue(queue);
      setIsUploading(true);

      for (const item of queue) {
        if (item.status === 'failed') continue;

        setUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading' } : q))
        );

        const result = repos.unitAttachments.add(unitId, item.file);

        if (result.success) {
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, status: 'done' } : q))
          );
        } else {
          setUploadQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: 'failed', error: result.error } : q
            )
          );
        }

        // Small delay between uploads for UX
        await new Promise((r) => setTimeout(r, 100));
      }

      setIsUploading(false);

      const successCount = queue.filter((q) => q.status !== 'failed' || !q.error).length;
      const failCount = queue.filter((q) => q.status === 'failed').length;

      if (successCount > 0 && failCount === 0) {
        toast({ title: `${successCount} image${successCount > 1 ? 's' : ''} uploaded` });
        setUploadQueue([]);
      } else if (failCount > 0) {
        toast({
          title: 'Some uploads failed',
          description: `${successCount} succeeded, ${failCount} failed`,
          variant: 'destructive',
        });
      }
    },
    [repos.unitAttachments, unitId, toast]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processUploadQueue(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/')
    );
    if (files.length > 0) {
      processUploadQueue(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      repos.unitAttachments.remove(deleteConfirm);
      toast({ title: 'Image deleted' });
      setDeleteConfirm(null);
    }
  };

  const handleSetPrimary = (attachmentId: string) => {
    repos.unitAttachments.setPrimary(attachmentId);
    toast({ title: 'Primary image updated' });
  };

  const handleUpdateTag = (attachmentId: string, tag: UnitAttachmentTag) => {
    repos.unitAttachments.update(attachmentId, { tag });
  };

  const handleUpdateNotes = (attachmentId: string, notes: string) => {
    repos.unitAttachments.update(attachmentId, { notes: notes || null });
    setEditingImage(null);
    toast({ title: 'Image notes updated' });
  };

  // Drag reorder handlers
  const handleReorderDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleReorderDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleReorderDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const currentOrder = sortedAttachments.map((a) => a.id);
    const draggedIndex = currentOrder.indexOf(draggedId);
    const targetIndex = currentOrder.indexOf(targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedId);

    repos.unitAttachments.reorder(unitId, newOrder);
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleReorderDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const clearFailedUploads = () => {
    setUploadQueue((prev) => prev.filter((q) => q.status !== 'failed'));
  };

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Images</CardTitle>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <ImagePlus className="w-4 h-4 mr-2" />
                Upload Images
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Upload Queue */}
          {uploadQueue.length > 0 && (
            <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>Upload Queue</span>
                {uploadQueue.some((q) => q.status === 'failed') && (
                  <Button variant="ghost" size="sm" onClick={clearFailedUploads}>
                    Clear failed
                  </Button>
                )}
              </div>
              {uploadQueue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 text-sm bg-background rounded px-2 py-1"
                >
                  {item.status === 'queued' && (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  {item.status === 'uploading' && (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  )}
                  {item.status === 'done' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                  {item.status === 'failed' && (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  )}
                  <span className="flex-1 truncate">{item.file.name}</span>
                  {item.error && (
                    <span className="text-xs text-destructive">{item.error}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Drop Zone / Empty State */}
          {sortedAttachments.length === 0 && uploadQueue.length === 0 && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDraggingOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Upload images
              </p>
              <p className="text-xs text-muted-foreground/70">
                Document condition, damage, or repairs. Drag & drop or click to browse.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                Choose Files
              </Button>
            </div>
          )}

          {/* Image Grid */}
          {sortedAttachments.length > 0 && (
            <div
              className={`relative ${isDraggingOver ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {sortedAttachments.map((att) => (
                  <div
                    key={att.id}
                    className={`group relative aspect-square rounded-lg overflow-hidden border bg-muted transition-all ${
                      draggedId === att.id ? 'opacity-50' : ''
                    } ${dragOverId === att.id ? 'ring-2 ring-primary' : ''}`}
                    draggable
                    onDragStart={() => handleReorderDragStart(att.id)}
                    onDragOver={(e) => handleReorderDragOver(e, att.id)}
                    onDrop={() => handleReorderDrop(att.id)}
                    onDragEnd={handleReorderDragEnd}
                  >
                    {/* Drag Handle */}
                    <div className="absolute top-1 left-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                      <GripVertical className="w-4 h-4 text-white drop-shadow-md" />
                    </div>

                    {/* Primary Badge */}
                    {att.is_primary && (
                      <div className="absolute top-1 right-1 z-10">
                        <Badge className="bg-amber-500 text-white border-0 text-xs px-1.5 py-0.5">
                          <Star className="w-3 h-3 mr-0.5" />
                          Primary
                        </Badge>
                      </div>
                    )}

                    {/* Tag Badge */}
                    <div className="absolute bottom-1 left-1 z-10">
                      <Badge
                        variant="outline"
                        className={`text-xs px-1.5 py-0 ${TAG_COLORS[att.tag]}`}
                      >
                        {TAG_LABELS[att.tag]}
                      </Badge>
                    </div>

                    {/* Image */}
                    <img
                      src={att.local_url || ''}
                      alt={att.filename}
                      className="w-full h-full object-cover"
                    />

                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                        onClick={() => setPreviewImage(att)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {!att.is_primary && (
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={() => handleSetPrimary(att.id)}
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8"
                        onClick={() => setDeleteConfirm(att.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Date */}
                    <div className="absolute bottom-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-white bg-black/60 px-1 rounded">
                        {new Date(att.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog (Lightbox) */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              {previewImage?.filename}
              {previewImage?.is_primary && (
                <Badge className="bg-amber-500 text-white border-0">Primary</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="relative bg-black flex items-center justify-center min-h-[400px] max-h-[70vh]">
            {previewImage && (
              <img
                src={previewImage.local_url || ''}
                alt={previewImage.filename}
                className="max-w-full max-h-[70vh] object-contain"
              />
            )}
          </div>
          <div className="p-4 pt-2 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Tag</Label>
                <Select
                  value={previewImage?.tag}
                  onValueChange={(v) => {
                    if (previewImage) {
                      handleUpdateTag(previewImage.id, v as UnitAttachmentTag);
                      setPreviewImage({ ...previewImage, tag: v as UnitAttachmentTag });
                    }
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General</SelectItem>
                    <SelectItem value="BEFORE">Before</SelectItem>
                    <SelectItem value="AFTER">After</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground">
                <Label className="text-xs text-muted-foreground">Uploaded</Label>
                <p>{previewImage && new Date(previewImage.created_at).toLocaleString()}</p>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a note..."
                  defaultValue={previewImage?.notes || ''}
                  onBlur={(e) => {
                    if (previewImage && e.target.value !== (previewImage.notes || '')) {
                      handleUpdateNotes(previewImage.id, e.target.value);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && previewImage) {
                      handleUpdateNotes(previewImage.id, (e.target as HTMLInputElement).value);
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between">
              {previewImage && !previewImage.is_primary && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleSetPrimary(previewImage.id);
                    setPreviewImage({ ...previewImage, is_primary: true });
                  }}
                >
                  <Star className="w-4 h-4 mr-1" />
                  Set as Primary
                </Button>
              )}
              {previewImage?.is_primary && <div />}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (previewImage) {
                    setDeleteConfirm(previewImage.id);
                    setPreviewImage(null);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The image will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
