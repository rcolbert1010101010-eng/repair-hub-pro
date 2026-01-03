import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRepos } from '@/repos';
import type { CycleCountLine } from '@/types';

export default function CycleCountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const repos = useRepos();
  const {
    cycleCountSessions,
    getCycleCountLines,
    addCycleCountLine,
    updateCycleCountLine,
    updateCycleCountSession,
    postCycleCountSession,
    cancelCycleCountSession,
  } = repos.cycleCounts;
  const { parts } = repos.parts;

  const session = cycleCountSessions.find((s) => s.id === id);
  const [title, setTitle] = useState(session?.title || '');
  const [notes, setNotes] = useState(session?.notes || '');
  const [postedBy, setPostedBy] = useState(session?.posted_by || 'system');
  const [newPartId, setNewPartId] = useState('');

  useEffect(() => {
    if (session) {
      setTitle(session.title || '');
      setNotes(session.notes || '');
      setPostedBy(session.posted_by || 'system');
    }
  }, [session]);

  const lines = id ? getCycleCountLines(id) : [];
  const availableParts = parts.filter((p) => p.is_active && !p.is_kit);
  const isReadOnly = !session || session.status !== 'DRAFT';

  if (!session) {
    return (
      <div className="page-container">
        <PageHeader title="Cycle Count Not Found" backTo="/cycle-counts" />
        <p className="text-muted-foreground">This cycle count session does not exist.</p>
      </div>
    );
  }

  const handleAddPart = () => {
    if (!newPartId) {
      toast({ title: 'Validation Error', description: 'Select a part to add', variant: 'destructive' });
      return;
    }
    const result = addCycleCountLine(session.id, newPartId);
    if (!result.success) {
      toast({ title: 'Error', description: result.error || 'Unable to add part', variant: 'destructive' });
    } else {
      setNewPartId('');
    }
  };

  const handleCountChange = (line: CycleCountLine, value: string) => {
    if (isReadOnly) return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    updateCycleCountLine(line.id, { counted_qty: parsed });
  };

  const handleReasonChange = (line: CycleCountLine, value: string) => {
    if (isReadOnly) return;
    updateCycleCountLine(line.id, { reason: value });
  };

  const handleSaveDraft = () => {
    updateCycleCountSession(session.id, {
      title: title.trim() || null,
      notes: notes.trim() || null,
      posted_by: postedBy.trim() || 'system',
    });
    toast({ title: 'Draft Saved', description: 'Cycle count details updated' });
  };

  const handlePost = () => {
    if (session.status !== 'DRAFT') return;
    updateCycleCountSession(session.id, {
      title: title.trim() || null,
      notes: notes.trim() || null,
      posted_by: postedBy.trim() || 'system',
    });
    const result = postCycleCountSession(session.id, postedBy);
    if (!result.success) {
      toast({ title: 'Cannot Post', description: result.error || 'Unable to post cycle count', variant: 'destructive' });
      return;
    }
    toast({ title: 'Cycle Count Posted', description: 'Inventory updated from cycle count' });
    navigate('/cycle-counts');
  };

  const handleCancel = () => {
    const result = cancelCycleCountSession(session.id);
    if (!result.success) {
      toast({ title: 'Cannot Cancel', description: result.error || 'Unable to cancel cycle count', variant: 'destructive' });
      return;
    }
    toast({ title: 'Cycle Count Cancelled', description: 'Session marked as cancelled' });
    navigate('/cycle-counts');
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title={session.title || 'Cycle Count'}
        subtitle={`Status: ${session.status}`}
        backTo="/cycle-counts"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveDraft} disabled={isReadOnly}>
              Save Draft
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isReadOnly}>
              Cancel
            </Button>
            <Button onClick={handlePost} disabled={isReadOnly}>
              Post Cycle Count
            </Button>
          </div>
        }
      />

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isReadOnly}
              placeholder="Optional title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="posted_by">Posted By</Label>
            <Input
              id="posted_by"
              value={postedBy}
              onChange={(e) => setPostedBy(e.target.value)}
              disabled={isReadOnly}
              placeholder="system"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isReadOnly}
            rows={3}
            placeholder="Add notes for this cycle count"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Created: {new Date(session.created_at).toLocaleString()}</span>
          {session.posted_at && <Badge variant="secondary">Posted {new Date(session.posted_at).toLocaleString()}</Badge>}
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3 items-end">
          <div className="col-span-2">
            <Label htmlFor="part_id">Add Part</Label>
            <Select value={newPartId} onValueChange={setNewPartId} disabled={isReadOnly}>
              <SelectTrigger id="part_id">
                <SelectValue placeholder="Select part" />
              </SelectTrigger>
              <SelectContent>
                {availableParts.map((part) => (
                  <SelectItem key={part.id} value={part.id}>
                    {part.part_number} — {part.description || 'No description'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAddPart} disabled={isReadOnly}>
              Add Part
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">Part #</th>
                <th className="py-2">Description</th>
                <th className="py-2">Bin</th>
                <th className="py-2 text-right">Expected</th>
                <th className="py-2 text-right">Counted</th>
                <th className="py-2 text-right">Variance</th>
                <th className="py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td className="py-4 text-center text-muted-foreground" colSpan={7}>
                    No parts added yet.
                  </td>
                </tr>
              ) : (
                lines.map((line) => {
                  const part = parts.find((p) => p.id === line.part_id);
                  const needsReason = line.variance !== 0 && !line.reason;
                  return (
                    <tr key={line.id} className="border-t border-border/60">
                      <td className="py-2 font-mono">{part?.part_number || '—'}</td>
                      <td className="py-2">{part?.description || '—'}</td>
                      <td className="py-2">{part?.bin_location || '—'}</td>
                      <td className="py-2 text-right">{line.expected_qty}</td>
                      <td className="py-2 text-right">
                        <Input
                          type="number"
                          className="w-24"
                          value={line.counted_qty}
                          onChange={(e) => handleCountChange(line, e.target.value)}
                          disabled={isReadOnly}
                        />
                      </td>
                      <td className="py-2 text-right font-medium">{line.variance}</td>
                      <td className="py-2">
                        <Input
                          value={line.reason || ''}
                          onChange={(e) => handleReasonChange(line, e.target.value)}
                          placeholder={line.variance !== 0 ? 'Required for variance' : 'Optional'}
                          disabled={isReadOnly}
                        />
                        {needsReason && <p className="text-xs text-destructive mt-1">Reason required when variance exists.</p>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
