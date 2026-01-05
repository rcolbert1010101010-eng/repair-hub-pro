import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRepos } from '@/repos';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';

type Line = {
  id: string;
  partId: string;
  qty: string;
};

const newId = () => Math.random().toString(36).slice(2, 9);

export default function ReceiveInventory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { parts: partsRepo, vendors: vendorsRepo, purchaseOrders: poRepo } = useRepos();
  const receiveInventory = partsRepo.receiveInventory;
  const parts = partsRepo.parts.filter((p) => p.is_active && !p.is_kit);
  const vendors = vendorsRepo.vendors;
  const { purchaseOrders, purchaseOrderLines } = poRepo;
  const [searchParams] = useSearchParams();
  const poId = searchParams.get('poId');
  const prefilledPo = useRef(false);

  const NONE = '__none__';
  const [vendorId, setVendorId] = useState<string>('');
  const [reference, setReference] = useState('');
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([]);
  const [selectedPart, setSelectedPart] = useState('');
  const [selectedQty, setSelectedQty] = useState('1');

  const partsById = useMemo(() => new Map(parts.map((p) => [p.id, p])), [parts]);
  const availableParts = useMemo(() => {
    const list = parts.filter((p) => (p as any).is_active !== false);
    if (!vendorId) return list;
    return list.filter((p) => p.vendor_id === vendorId);
  }, [parts, vendorId]);
  const hasValidLines = useMemo(
    () =>
      lines.length > 0 &&
      lines.every((l) => l.partId && Number.isFinite(Number(l.qty)) && Number(l.qty) > 0),
    [lines]
  );

  const addLine = () => {
    if (!selectedPart) {
      toast({ title: 'Select a part', variant: 'destructive' });
      return;
    }
    const qtyNum = Number(selectedQty);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      toast({ title: 'Quantity must be greater than 0', variant: 'destructive' });
      return;
    }

    setLines((prev) => {
      const existing = prev.find((l) => l.partId === selectedPart);
      if (existing) {
        toast({ title: 'Merged duplicate line' });
        return prev.map((l) =>
          l.partId === selectedPart ? { ...l, qty: String(qtyNum + Number(l.qty || 0)) } : l
        );
      }
      return [...prev, { id: newId(), partId: selectedPart, qty: String(qtyNum) }];
    });
    setSelectedPart('');
    setSelectedQty('1');
  };

  const updateLineQty = (id: string, value: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, qty: value } : l)));
  };

  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id));

  const clearForm = () => {
    setVendorId('');
    setReference('');
    setReceivedDate(new Date().toISOString().slice(0, 10));
    setLines([]);
    setSelectedPart('');
    setSelectedQty('1');
  };

  const handlePost = () => {
    if (!receiveInventory) {
      toast({ title: 'Receive not available', variant: 'destructive' });
      return;
    }
    const prepared = lines
      .map((l) => ({ part_id: l.partId, quantity: Number(l.qty) }))
      .filter((l) => l.part_id && Number.isFinite(l.quantity) && l.quantity > 0);
    if (prepared.length === 0) {
      toast({ title: 'Add at least one line with quantity', variant: 'destructive' });
      return;
    }
    const result = receiveInventory({
      lines: prepared,
      vendor_id: vendorId ? vendorId : null,
      reference: reference.trim() || null,
      received_at: receivedDate ? new Date(receivedDate).toISOString() : undefined,
      source_type: poId ? 'PURCHASE_ORDER' : 'MANUAL',
      source_id: poId || null,
    });
    if (!result?.success) {
      toast({ title: 'Receive failed', description: result?.error || 'Unable to post receipt', variant: 'destructive' });
      return;
    }
    toast({ title: 'Receipt posted', description: `Received ${prepared.length} line(s) • QOH updated` });
    clearForm();
    navigate('/inventory');
  };

  useEffect(() => {
    if (selectedPart && !availableParts.find((p) => p.id === selectedPart)) {
      setSelectedPart('');
    }
  }, [availableParts, selectedPart]);

  useEffect(() => {
    if (!poId || prefilledPo.current) return;
    const po = purchaseOrders.find((o) => o.id === poId);
    if (!po) return;
    prefilledPo.current = true;
    setVendorId(po.vendor_id);
    setReference((prev) => prev || po.po_number || `PO:${poId}`);
    const remainingLines = purchaseOrderLines
      .filter((l) => l.purchase_order_id === poId)
      .map((l) => ({ line: l, remaining: l.ordered_quantity - l.received_quantity }))
      .filter((l) => l.remaining > 0);
    setLines(
      remainingLines.map((l) => ({
        id: newId(),
        partId: l.line.part_id,
        qty: String(l.remaining),
      }))
    );
  }, [poId, purchaseOrderLines, purchaseOrders]);

  return (
    <div className="page-container space-y-4">
      <PageHeader title="Receive Inventory" subtitle="Increase stock with audit trail" backTo="/inventory" />

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Vendor</Label>
            <Select
              value={vendorId || NONE}
              onValueChange={(val) => setVendorId(val === NONE ? '' : val)}
              disabled={Boolean(poId)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No vendor</SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.vendor_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reference</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Invoice / packing slip #" />
          </div>
          <div className="space-y-2">
            <Label>Received Date</Label>
            <Input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="space-y-2">
            <Label>Add Part</Label>
            <Select value={selectedPart} onValueChange={setSelectedPart}>
              <SelectTrigger>
                <SelectValue placeholder="Select part" />
              </SelectTrigger>
              <SelectContent>
                {availableParts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.part_number} — {p.description || 'No description'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Qty Received</Label>
            <Input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={selectedQty}
              onChange={(e) => setSelectedQty(e.target.value)}
            />
          </div>
          <div className="flex md:justify-end">
            <Button onClick={addLine}>Add Line</Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">Part</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td className="py-4 text-center text-muted-foreground" colSpan={3}>
                    No lines added.
                  </td>
                </tr>
              ) : (
                lines.map((line) => {
                  const part = partsById.get(line.partId);
                  return (
                    <tr key={line.id} className="border-t border-border/60">
                      <td className="py-2">
                        <div className="font-medium">{part?.part_number || 'Unknown part'}</div>
                        <div className="text-xs text-muted-foreground">{part?.description || '—'}</div>
                      </td>
                      <td className="py-2 text-right">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          className="w-24 ml-auto"
                          value={line.qty}
                          onChange={(e) => updateLineQty(line.id, e.target.value)}
                        />
                        {(!Number.isFinite(Number(line.qty)) || Number(line.qty) <= 0) && (
                          <p className="text-xs text-destructive mt-1 text-right">Qty must be greater than 0.</p>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <Button variant="ghost" size="icon" onClick={() => removeLine(line.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={clearForm}>
            Clear
          </Button>
          <Button onClick={handlePost} disabled={!hasValidLines}>
            Post Receipt
          </Button>
        </div>
      </Card>
    </div>
  );
}
