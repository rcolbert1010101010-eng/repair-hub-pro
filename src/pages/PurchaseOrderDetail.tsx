import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useShopStore } from '@/stores/shopStore';
import { useToast } from '@/hooks/use-toast';
import { Save, Plus, Trash2, PackageCheck, Lock } from 'lucide-react';
import { QuickAddDialog } from '@/components/ui/quick-add-dialog';

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    purchaseOrders, vendors, parts, createPurchaseOrder, poAddLine, poRemoveLine, poReceive, poClose, getPurchaseOrderLines,
  } = useShopStore();
  const { toast } = useToast();

  const isNew = id === 'new';
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [order, setOrder] = useState(() => (!isNew ? purchaseOrders.find((o) => o.id === id) : null));

  const [addPartOpen, setAddPartOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState('1');

  const [receiveLineId, setReceiveLineId] = useState<string | null>(null);
  const [receiveQty, setReceiveQty] = useState('');
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  const currentOrder = order || purchaseOrders.find((o) => o.id === id);
  const activeVendors = vendors.filter((v) => v.is_active);
  const activeParts = parts.filter((p) => p.is_active);
  const isClosed = currentOrder?.status === 'CLOSED';

  if (!isNew && !currentOrder) {
    return (
      <div className="page-container">
        <PageHeader title="PO Not Found" backTo="/purchase-orders" />
        <p className="text-muted-foreground">This purchase order does not exist.</p>
      </div>
    );
  }

  const handleCreate = () => {
    if (!selectedVendorId) {
      toast({ title: 'Error', description: 'Please select a vendor', variant: 'destructive' });
      return;
    }
    const newOrder = createPurchaseOrder(selectedVendorId);
    navigate(`/purchase-orders/${newOrder.id}`, { replace: true });
    setOrder(newOrder);
    toast({ title: 'PO Created', description: `${newOrder.po_number} created` });
  };

  const handleAddPart = () => {
    if (!selectedPartId || !currentOrder) return;
    const result = poAddLine(currentOrder.id, selectedPartId, parseInt(partQty) || 1);
    if (result.success) {
      toast({ title: 'Part Added' });
      setAddPartOpen(false);
      setSelectedPartId('');
      setPartQty('1');
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleReceive = () => {
    if (!receiveLineId) return;
    const result = poReceive(receiveLineId, parseInt(receiveQty) || 0);
    if (result.success) {
      toast({ title: 'Items Received', description: 'Inventory has been updated' });
      setReceiveLineId(null);
      setReceiveQty('');
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleClose = () => {
    if (!currentOrder) return;
    const result = poClose(currentOrder.id);
    if (result.success) {
      toast({ title: 'PO Closed' });
      setShowCloseDialog(false);
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const lines = currentOrder ? getPurchaseOrderLines(currentOrder.id) : [];
  const vendor = vendors.find((v) => v.id === currentOrder?.vendor_id);
  const allReceived = lines.length > 0 && lines.every((l) => l.received_quantity >= l.ordered_quantity);

  if (isNew && !order) {
    return (
      <div className="page-container">
        <PageHeader title="New Purchase Order" backTo="/purchase-orders" />
        <div className="form-section max-w-xl">
          <div className="space-y-4">
            <div>
              <Label>Vendor *</Label>
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  {activeVendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.vendor_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Create PO
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title={currentOrder?.po_number || 'Purchase Order'}
        subtitle={isClosed ? 'Closed' : 'Open'}
        backTo="/purchase-orders"
        actions={
          !isClosed && (
            <>
              <Button size="sm" onClick={() => setAddPartOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Part
              </Button>
              {allReceived && (
                <Button onClick={() => setShowCloseDialog(true)}>
                  <Lock className="w-4 h-4 mr-2" />
                  Close PO
                </Button>
              )}
            </>
          )
        }
      />

      <div className="form-section mb-6">
        <p className="text-sm text-muted-foreground">Vendor: <span className="font-medium text-foreground">{vendor?.vendor_name}</span></p>
      </div>

      <div className="table-container">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part #</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Ordered</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              {!isClosed && <TableHead className="w-32">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No parts added</TableCell>
              </TableRow>
            ) : (
              lines.map((line) => {
                const part = parts.find((p) => p.id === line.part_id);
                const remaining = line.ordered_quantity - line.received_quantity;
                return (
                  <TableRow key={line.id}>
                    <TableCell className="font-mono">{part?.part_number}</TableCell>
                    <TableCell>{part?.description || '-'}</TableCell>
                    <TableCell className="text-right">{line.ordered_quantity}</TableCell>
                    <TableCell className="text-right">{line.received_quantity}</TableCell>
                    <TableCell className="text-right">${line.unit_cost.toFixed(2)}</TableCell>
                    {!isClosed && (
                      <TableCell>
                        <div className="flex gap-2">
                          {remaining > 0 && (
                            <Button size="sm" variant="outline" onClick={() => { setReceiveLineId(line.id); setReceiveQty(String(remaining)); }}>
                              <PackageCheck className="w-3 h-3 mr-1" />
                              Receive
                            </Button>
                          )}
                          {line.received_quantity === 0 && (
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => poRemoveLine(line.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Part Dialog */}
      <QuickAddDialog open={addPartOpen} onOpenChange={setAddPartOpen} title="Add Part to PO" onSave={handleAddPart} onCancel={() => setAddPartOpen(false)}>
        <div className="space-y-4">
          <div>
            <Label>Part *</Label>
            <Select value={selectedPartId} onValueChange={setSelectedPartId}>
              <SelectTrigger><SelectValue placeholder="Select part" /></SelectTrigger>
              <SelectContent>
                {activeParts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.part_number} - {p.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantity</Label>
            <Input type="number" min="1" value={partQty} onChange={(e) => setPartQty(e.target.value)} />
          </div>
        </div>
      </QuickAddDialog>

      {/* Receive Dialog */}
      <QuickAddDialog open={!!receiveLineId} onOpenChange={(o) => !o && setReceiveLineId(null)} title="Receive Items" onSave={handleReceive} onCancel={() => setReceiveLineId(null)}>
        <div>
          <Label>Quantity to Receive</Label>
          <Input type="number" min="1" value={receiveQty} onChange={(e) => setReceiveQty(e.target.value)} />
        </div>
      </QuickAddDialog>

      {/* Close PO Dialog */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Purchase Order?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently lock the PO. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose}>Close PO</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
