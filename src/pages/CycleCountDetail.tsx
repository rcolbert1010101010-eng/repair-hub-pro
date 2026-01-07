import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useRepos } from '@/repos';
import { useShopStore } from '@/stores/shopStore';
import type { CycleCountLine } from '@/types';

export default function CycleCountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const repos = useRepos();
  const {
    addCycleCountLine,
    updateCycleCountLine,
    updateCycleCountSession,
    postCycleCountSession,
    cancelCycleCountSession,
  } = repos.cycleCounts;
  const { parts } = repos.parts;
  const { vendors } = repos.vendors;
  const { categories } = repos.categories;

  const cycleCountSessions = useShopStore((s) => s.cycleCountSessions);
  const cycleCountLines = useShopStore((s) => s.cycleCountLines);
  const session = cycleCountSessions.find((s) => s.id === id);
  const [title, setTitle] = useState(session?.title || '');
  const [notes, setNotes] = useState(session?.notes || '');
  const [postedBy, setPostedBy] = useState(session?.posted_by || 'system');
  const [newPartId, setNewPartId] = useState('');
  const ALL_SCOPE = '__ALL__';
  const [scopeVendor, setScopeVendor] = useState<string>(ALL_SCOPE);
  const [scopeCategory, setScopeCategory] = useState<string>(ALL_SCOPE);
  const [scopeBin, setScopeBin] = useState<string>(ALL_SCOPE);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pendingFocusPartId, setPendingFocusPartId] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(() => Boolean(session?.notes));

  useEffect(() => {
    if (session) {
      setTitle(session.title || '');
      setNotes(session.notes || '');
      setPostedBy(session.posted_by || 'system');
    }
  }, [session]);

  const lines = useMemo(
    () => (id ? cycleCountLines.filter((l) => l.session_id === id) : []),
    [cycleCountLines, id]
  );
  const availableParts = parts.filter((p) => p.is_active && !p.is_kit);
  const isReadOnly = !session || session.status !== 'DRAFT';
  const negativePolicy =
    useShopStore((s) => s.settings?.inventory_negative_qoh_policy) ?? 'WARN';
  const countedRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const addPartTriggerRef = useRef<HTMLButtonElement | null>(null);
  const vendorsList = useMemo(
    () => vendors.map((v) => ({ id: v.id, name: v.vendor_name })).filter((v) => v.id && v.name),
    [vendors]
  );
  const categoriesList = useMemo(
    () => categories.map((c) => ({ id: c.id, name: c.category_name })).filter((c) => c.id && c.name),
    [categories]
  );
  const binOptions = useMemo(() => {
    const bins = new Set<string>();
    parts.forEach((p) => {
      if (p.bin_location) bins.add(p.bin_location);
    });
    return Array.from(bins.values());
  }, [parts]);
  const existingLinePartIds = useMemo(() => new Set(lines.map((l) => l.part_id)), [lines]);
  const countedLines = useMemo(
    () => lines.filter((l) => l.counted_qty !== null && l.counted_qty !== undefined),
    [lines]
  );
  const varianceLines = useMemo(
    () => countedLines.filter((l) => l.counted_qty !== l.expected_qty),
    [countedLines]
  );
  const missingReasonLines = useMemo(
    () => varianceLines.filter((l) => l.variance !== 0 && !l.reason?.trim()),
    [varianceLines]
  );
  const negativeLines = useMemo(
    () => varianceLines.filter((l) => (l.counted_qty ?? 0) < 0),
    [varianceLines]
  );
  const varianceSum = useMemo(
    () => lines.reduce((sum, l) => sum + ((l.counted_qty ?? l.expected_qty) - l.expected_qty), 0),
    [lines]
  );
  const lastCountDate = session.posted_at || session.updated_at || session.created_at;
  const lastCountDays = lastCountDate
    ? Math.floor((Date.now() - new Date(lastCountDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const postBlocked =
    missingReasonLines.length > 0 || (negativePolicy === 'BLOCK' && negativeLines.length > 0) || isReadOnly;
  const postWarning = negativePolicy === 'WARN' && negativeLines.length > 0;
  const statusMessages = useMemo(() => {
    const blocks: string[] = [];
    const warns: string[] = [];
    if (missingReasonLines.length > 0) blocks.push('Reason required for all variances.');
    if (negativePolicy === 'BLOCK' && negativeLines.length > 0) blocks.push('Negative QOH is blocked by policy.');
    if (postWarning) warns.push('Posting will set some parts below zero (policy=WARN).');
    return { blocks, warns };
  }, [missingReasonLines.length, negativeLines.length, negativePolicy, postWarning]);

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
      setPendingFocusPartId(newPartId);
    }
  };

  const handleClearScope = () => {
    setScopeVendor(ALL_SCOPE);
    setScopeCategory(ALL_SCOPE);
    setScopeBin(ALL_SCOPE);
  };

  const handleAddPartsByScope = () => {
    if (isReadOnly) return;
    const scopedParts = availableParts.filter((part) => {
      if (scopeVendor !== ALL_SCOPE && part.vendor_id !== scopeVendor) return false;
      if (scopeCategory !== ALL_SCOPE && part.category_id !== scopeCategory) return false;
      if (scopeBin !== ALL_SCOPE && part.bin_location !== scopeBin) return false;
      return true;
    });

    const totalInScope = scopedParts.length;
    if (totalInScope === 0) {
      toast({
        title: 'No matching parts',
        description: 'Adjust the scope filters to find parts to add.',
        variant: 'destructive',
      });
      return;
    }

    let added = 0;
    let skipped = 0;
    const seen = new Set(existingLinePartIds);

    scopedParts.forEach((part) => {
      if (seen.has(part.id)) {
        skipped += 1;
        return;
      }
      const result = addCycleCountLine(session.id, part.id);
      if (result.success) {
        added += 1;
        seen.add(part.id);
      } else {
        skipped += 1;
      }
    });

    toast({
      title: 'Parts added by scope',
      description: `Added ${added}, Skipped ${skipped}, Total ${totalInScope}`,
      variant: added === 0 ? 'destructive' : 'default',
    });
    if (added > 0) {
      const firstNew = scopedParts.find((p) => !existingLinePartIds.has(p.id));
      if (firstNew) setPendingFocusPartId(firstNew.id);
    }
  };

  const handleCountChange = (line: CycleCountLine, value: string) => {
    if (isReadOnly) return;
    if (value === '') {
      updateCycleCountLine(line.id, { counted_qty: null });
      return;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return;
    updateCycleCountLine(line.id, { counted_qty: parsed });
  };

  const focusNextInput = (lineId: string) => {
    const idx = lines.findIndex((l) => l.id === lineId);
    if (idx === -1) return;
    for (let i = idx + 1; i < lines.length; i++) {
      const next = lines[i];
      if (!next) continue;
      const ref = countedRefs.current[next.id];
      if (ref && !ref.disabled) {
        ref.focus();
        ref.select?.();
        return;
      }
    }
    addPartTriggerRef.current?.focus();
  };

  const handleCountKeyDown = (lineId: string, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      focusNextInput(lineId);
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const line = lines.find((l) => l.id === lineId);
      if (!line || isReadOnly) return;
      const current = Number(line.counted_qty ?? 0);
      const delta = e.key === 'ArrowUp' ? 1 : -1;
      updateCycleCountLine(line.id, { counted_qty: current + delta });
      return;
    }
    if (e.key === 'Escape') {
      e.currentTarget.blur();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'enter') {
      e.preventDefault();
      if (!postBlocked) handlePost();
    }
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
    if (postBlocked) return;
    setReviewOpen(true);
  };

  const confirmPost = () => {
    if (session.status !== 'DRAFT') return;
    if (missingReasonLines.length > 0) {
      toast({
        title: 'Reason required',
        description: 'Provide a reason for each variance before posting.',
        variant: 'destructive',
      });
      return;
    }
    if (negativePolicy === 'BLOCK' && negativeLines.length > 0) {
      toast({
        title: 'Posting blocked',
        description: 'One or more lines would set QOH below zero. Adjust counts or policy.',
        variant: 'destructive',
      });
      return;
    }
    if (negativePolicy === 'WARN' && negativeLines.length > 0) {
      toast({
        title: 'Warning: negative QOH',
        description: 'Posting will set some parts below zero.',
        variant: 'destructive',
      });
    }
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
    setReviewOpen(false);
    navigate('/cycle-counts');
  };

  useEffect(() => {
    if (!pendingFocusPartId) return;
    const targetLine = lines.find((l) => l.part_id === pendingFocusPartId);
    if (targetLine) {
      const input = countedRefs.current[targetLine.id];
      if (input) {
        requestAnimationFrame(() => input.focus());
        setPendingFocusPartId(null);
      }
    }
  }, [lines, pendingFocusPartId]);

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
            <Button onClick={handlePost} disabled={postBlocked}>
              Post Cycle Count
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {lastCountDate && (
          <span className="rounded-md bg-muted px-2 py-1">
            Last count {lastCountDays != null && lastCountDays >= 0 ? `${lastCountDays}d ago` : new Date(lastCountDate).toLocaleDateString()}
          </span>
        )}
        <span className="rounded-md bg-muted px-2 py-1">Δ {varianceSum > 0 ? `+${varianceSum}` : varianceSum}</span>
      </div>

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
          {session.status === 'POSTED' && (
            <div className="space-y-1">
              <Label>Posted By</Label>
              <p className="text-sm text-muted-foreground">{session.posted_by || '—'}</p>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="notes">Notes</Label>
            <Button variant="ghost" size="sm" onClick={() => setShowNotes((v) => !v)}>
              {showNotes ? 'Hide notes' : 'Add notes'}
            </Button>
          </div>
          {showNotes && (
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isReadOnly}
              rows={3}
              placeholder="Add notes for this cycle count"
            />
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Created: {new Date(session.created_at).toLocaleString()}</span>
          {session.posted_at && <Badge variant="secondary">Posted {new Date(session.posted_at).toLocaleString()}</Badge>}
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <Label>Vendor</Label>
            <Select value={scopeVendor} onValueChange={setScopeVendor} disabled={isReadOnly}>
              <SelectTrigger>
                <SelectValue placeholder="All vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SCOPE}>All vendors</SelectItem>
                {vendorsList.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px] flex-1">
            <Label>Category</Label>
            <Select value={scopeCategory} onValueChange={setScopeCategory} disabled={isReadOnly}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SCOPE}>All categories</SelectItem>
                {categoriesList.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {binOptions.length > 0 && (
            <div className="min-w-[200px] flex-1">
            <Label>Bin / Location</Label>
            <Select value={scopeBin} onValueChange={setScopeBin} disabled={isReadOnly}>
              <SelectTrigger>
                <SelectValue placeholder="All bins" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SCOPE}>All bins</SelectItem>
                {binOptions.map((bin) => (
                  <SelectItem key={bin} value={bin}>
                    {bin}
                  </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClearScope} disabled={isReadOnly}>
              Clear scope
            </Button>
            <Button onClick={handleAddPartsByScope} disabled={isReadOnly}>
              Add Parts by Scope
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 items-end">
          <div className="col-span-2">
            <Label htmlFor="part_id">Add Part</Label>
            <Select value={newPartId} onValueChange={setNewPartId} disabled={isReadOnly}>
              <SelectTrigger id="part_id" ref={addPartTriggerRef}>
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

      {lines.length > 0 &&
        (varianceLines.length > 0 ||
          missingReasonLines.length > 0 ||
          (negativePolicy !== 'ALLOW' && negativeLines.length > 0)) && (
          <Card className="p-4 space-y-3">
            <div>
              <h3 className="text-base font-semibold">Variance Review</h3>
              <p className="text-sm text-muted-foreground">
                Variances require a reason. Negative counts follow the inventory policy.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2">Part</th>
                    <th className="py-2 text-right">System QOH</th>
                    <th className="py-2 text-right">Counted</th>
                    <th className="py-2 text-right">Delta</th>
                    <th className="py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {varianceLines.length === 0 ? (
                    <tr>
                      <td className="py-3 text-center text-muted-foreground" colSpan={5}>
                        No variances. Posting will use counted quantities.
                      </td>
                    </tr>
                  ) : (
                    varianceLines.map((line) => {
                      const part = parts.find((p) => p.id === line.part_id);
                      const missingReason = line.variance !== 0 && !line.reason?.trim();
                      const isNegative = (line.counted_qty ?? 0) < 0;
                      return (
                        <tr key={line.id} className="border-t border-border/60">
                          <td className="py-2">
                            <div className="font-medium">{part?.part_number || '—'}</div>
                            <div className="text-xs text-muted-foreground">{part?.description || '—'}</div>
                          </td>
                          <td className="py-2 text-right">{line.expected_qty}</td>
                          <td className="py-2 text-right">{line.counted_qty}</td>
                          <td className={`py-2 text-right ${line.variance !== 0 ? 'font-semibold' : ''}`}>{line.variance}</td>
                          <td className="py-2">
                            <div className="text-sm">{line.reason || '—'}</div>
                            {missingReason && <p className="text-xs text-destructive">Reason required.</p>}
                            {isNegative && <p className="text-xs text-destructive">Would set QOH below zero.</p>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

      <Card className="p-4 space-y-2">
        {lines.length > 0 && (statusMessages.blocks.length > 0 || statusMessages.warns.length > 0 || varianceLines.length === 0) && (
          <div className="rounded-md border border-border/60 bg-muted/50 p-3 text-sm space-y-1">
            {statusMessages.blocks.map((m) => (
              <p key={m} className="text-destructive">
                {m}
              </p>
            ))}
            {statusMessages.warns.map((m) => (
              <p key={m} className="text-amber-600">
                {m}
              </p>
            ))}
            {statusMessages.blocks.length === 0 && statusMessages.warns.length === 0 && varianceLines.length === 0 && (
              <p className="text-muted-foreground">No variances detected. Counts match expected quantities.</p>
            )}
          </div>
        )}
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
                          value={line.counted_qty ?? ''}
                          onChange={(e) => handleCountChange(line, e.target.value)}
                          onKeyDown={(e) => handleCountKeyDown(line.id, e)}
                          onFocus={(e) => e.currentTarget.select()}
                          disabled={isReadOnly}
                          step={1}
                          inputMode="numeric"
                          ref={(el) => {
                            countedRefs.current[line.id] = el;
                          }}
                        />
                      </td>
                      <td className="py-2 text-right font-medium">{line.variance}</td>
                      <td className="py-2">
                        {line.variance !== 0 ? (
                          <>
                            <Input
                              value={line.reason || ''}
                              onChange={(e) => handleReasonChange(line, e.target.value)}
                              placeholder="Required for variance"
                              disabled={isReadOnly}
                            />
                            {needsReason && (
                              <p className="text-xs text-destructive mt-1">Reason required when variance exists.</p>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review Variances</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {negativePolicy === 'BLOCK' && negativeLines.length > 0 && (
              <p className="text-sm text-destructive">
                Posting is blocked: {negativeLines.length} item(s) would go negative.
              </p>
            )}
            {negativePolicy === 'WARN' && negativeLines.length > 0 && (
              <p className="text-sm text-amber-600">
                Warning: {negativeLines.length} item(s) will go negative if posted.
              </p>
            )}
            {missingReasonLines.length > 0 && (
              <p className="text-sm text-destructive">
                {missingReasonLines.length} variance line(s) need a reason before posting.
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2">Part</th>
                    <th className="py-2 text-right">System</th>
                    <th className="py-2 text-right">Counted</th>
                    <th className="py-2 text-right">Delta</th>
                    <th className="py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {varianceLines.length === 0 ? (
                    <tr>
                      <td className="py-3 text-center text-muted-foreground" colSpan={5}>
                        No variances. Posting will apply counted quantities.
                      </td>
                    </tr>
                  ) : (
                    varianceLines.map((line) => {
                      const part = parts.find((p) => p.id === line.part_id);
                      const missingReason = line.variance !== 0 && !line.reason?.trim();
                      const isNegative = (line.counted_qty ?? 0) < 0;
                      return (
                        <tr key={line.id} className="border-t border-border/60">
                          <td className="py-2">
                            <div className="font-medium">{part?.part_number || '—'}</div>
                            <div className="text-xs text-muted-foreground">{part?.description || '—'}</div>
                          </td>
                          <td className="py-2 text-right">{line.expected_qty}</td>
                          <td className="py-2 text-right">{line.counted_qty}</td>
                          <td className={`py-2 text-right ${line.variance !== 0 ? 'font-semibold' : ''}`}>
                            {line.variance}
                          </td>
                          <td className="py-2">
                            <div className="text-sm">{line.reason || '—'}</div>
                            {missingReason && <p className="text-xs text-destructive">Reason required.</p>}
                            {isNegative && <p className="text-xs text-destructive">Would set QOH below zero.</p>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmPost} disabled={negativePolicy === 'BLOCK' && negativeLines.length > 0}>
              Post Cycle Count
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
