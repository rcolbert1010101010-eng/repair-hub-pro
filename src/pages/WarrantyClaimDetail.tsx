import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { useRepos } from '@/repos';
import type { WarrantyClaimStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { getWarrantyClaimInsights } from '@/services/returnsWarrantyInsights';

const STATUS_FLOW: WarrantyClaimStatus[] = ['OPEN', 'SUBMITTED', 'APPROVED', 'DENIED', 'PAID', 'CLOSED', 'CANCELLED'];

const toNumber = (value: number | string | null | undefined) => {
  const numeric = typeof value === 'number' ? value : value != null ? Number(value) : NaN;
  return Number.isFinite(numeric) ? numeric : 0;
};

export default function WarrantyClaimDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const repos = useRepos();
  const { warrantyClaims, updateWarrantyClaim, setWarrantyClaimStatus, addWarrantyClaimLine, removeWarrantyClaimLine, getWarrantyClaimLines } = repos.warranty;
  const { vendors } = repos.vendors;
  const { parts } = repos.parts;
  const claim = warrantyClaims.find((c) => c.id === id);
  const [newLineType, setNewLineType] = useState<'part' | 'labor'>('part');
  const [newLinePartId, setNewLinePartId] = useState('');
  const [newLineQty, setNewLineQty] = useState('1');
  const [newLineCost, setNewLineCost] = useState('');
  const [newLineDesc, setNewLineDesc] = useState('');
  const [newLineHours, setNewLineHours] = useState('1');
  const [newLineRate, setNewLineRate] = useState('');

  const lines = useMemo(() => (claim ? getWarrantyClaimLines(claim.id) : []), [claim, getWarrantyClaimLines]);
  const vendor = vendors.find((v) => v.id === claim?.vendor_id);
  const insight = claim ? getWarrantyClaimInsights(claim, { claims: warrantyClaims, claimLines: repos.warranty.warrantyClaimLines }) : null;

  if (!claim) {
    return (
      <div className="page-container">
        <PageHeader title="Claim Not Found" backTo="/warranty" />
        <p className="text-muted-foreground">This warranty claim does not exist.</p>
      </div>
    );
  }

  const handleStatusChange = (status: WarrantyClaimStatus) => setWarrantyClaimStatus(claim.id, status);

  const handleFieldChange = (field: keyof typeof claim, value: string | null | number) => {
    updateWarrantyClaim(claim.id, { [field]: value, updated_at: new Date().toISOString() });
  };

  const handleAddLine = () => {
    if (newLineType === 'part') {
      if (!newLinePartId || Number(newLineQty) <= 0) return;
      addWarrantyClaimLine(claim.id, {
        part_id: newLinePartId,
        quantity: Number(newLineQty),
        unit_cost: newLineCost === '' ? null : Number(newLineCost),
        amount: newLineCost ? Number(newLineCost) * Number(newLineQty) : null,
      });
    } else {
      addWarrantyClaimLine(claim.id, {
        description: newLineDesc || null,
        labor_hours: Number(newLineHours) || null,
        labor_rate: newLineRate === '' ? null : Number(newLineRate),
        amount: newLineRate ? Number(newLineRate) * Number(newLineHours) : null,
      });
    }
    setNewLinePartId('');
    setNewLineQty('1');
    setNewLineCost('');
    setNewLineDesc('');
    setNewLineHours('1');
    setNewLineRate('');
  };

  const totalRequested = lines.reduce((sum, l) => sum + (l.amount || 0), 0);
  const handleNumberField = (field: keyof typeof claim, value: string) => {
    if (value === '') {
      handleFieldChange(field, null);
      return;
    }
    const num = Number(value);
    if (Number.isNaN(num) || num < 0) return;
    handleFieldChange(field, num);
  };

  return (
    <div className="page-container">
      <PageHeader
        title={claim.claim_number || claim.id}
        subtitle={vendor?.vendor_name || 'Warranty Claim'}
        backTo="/warranty"
        actions={<StatusBadge status={claim.status} />}
      />

      <div className="form-section space-y-4">
        {insight && (
          <div className="flex items-center gap-2">
            <Badge variant={insight.severity === 'danger' ? 'destructive' : insight.severity === 'warning' ? 'secondary' : 'outline'}>
              {insight.summary}
            </Badge>
            {insight.severity !== 'info' && (
              <span className="text-xs text-destructive">{insight.flags.join(', ')}</span>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {STATUS_FLOW.map((status) => (
            <Button
              key={status}
              size="sm"
              variant={claim.status === status ? 'default' : 'outline'}
              onClick={() => handleStatusChange(status)}
            >
              {status}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Claim #</label>
            <Input value={claim.claim_number || ''} onChange={(e) => handleFieldChange('claim_number', e.target.value || null)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">RMA #</label>
            <Input value={claim.rma_number || ''} onChange={(e) => handleFieldChange('rma_number', e.target.value || null)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-muted-foreground">Reason</label>
            <Input value={claim.reason || ''} onChange={(e) => handleFieldChange('reason', e.target.value || null)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-muted-foreground">Notes</label>
            <Textarea value={claim.notes || ''} onChange={(e) => handleFieldChange('notes', e.target.value || null)} rows={3} />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Approved Amount</label>
            <Input
              type="number"
              min="0"
              value={claim.approved_amount ?? ''}
              onChange={(e) => handleNumberField('approved_amount', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Credit Memo #</label>
            <Input value={claim.credit_memo_number || ''} onChange={(e) => handleFieldChange('credit_memo_number', e.target.value || null)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Credit Memo Amount</label>
            <Input
              type="number"
              min="0"
              value={claim.credit_memo_amount ?? ''}
              onChange={(e) => handleNumberField('credit_memo_amount', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Credit Memo Date</label>
            <Input
              type="date"
              value={claim.credit_memo_date ? claim.credit_memo_date.substring(0, 10) : ''}
              onChange={(e) => handleFieldChange('credit_memo_date', e.target.value || null)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Reimbursed Amount</label>
            <Input
              type="number"
              min="0"
              value={claim.reimbursed_amount ?? ''}
              onChange={(e) => handleNumberField('reimbursed_amount', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Reimbursed Date</label>
            <Input
              type="date"
              value={claim.reimbursed_date ? claim.reimbursed_date.substring(0, 10) : ''}
              onChange={(e) => handleFieldChange('reimbursed_date', e.target.value || null)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm text-muted-foreground">Reimbursement Reference</label>
            <Input
              value={claim.reimbursement_reference || ''}
              onChange={(e) => handleFieldChange('reimbursement_reference', e.target.value || null)}
            />
          </div>
        </div>

        <div className="table-container">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Claim Lines</h3>
            <div className="flex flex-wrap gap-2">
              <Select value={newLineType} onValueChange={(val) => setNewLineType(val as 'part' | 'labor')}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="part">Part</SelectItem>
                  <SelectItem value="labor">Labor</SelectItem>
                </SelectContent>
              </Select>
              {newLineType === 'part' ? (
                <>
                  <Select value={newLinePartId} onValueChange={setNewLinePartId}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select part" />
                    </SelectTrigger>
                    <SelectContent>
                      {parts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.part_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="1"
                    value={newLineQty}
                    onChange={(e) => setNewLineQty(e.target.value)}
                    className="w-20"
                    placeholder="Qty"
                  />
                  <Input
                    type="number"
                    value={newLineCost}
                    onChange={(e) => setNewLineCost(e.target.value)}
                    className="w-24"
                    placeholder="Unit Cost"
                  />
                </>
              ) : (
                <>
                  <Input
                    value={newLineDesc}
                    onChange={(e) => setNewLineDesc(e.target.value)}
                    className="w-48"
                    placeholder="Description"
                  />
                  <Input
                    type="number"
                    value={newLineHours}
                    onChange={(e) => setNewLineHours(e.target.value)}
                    className="w-24"
                    placeholder="Hours"
                  />
                  <Input
                    type="number"
                    value={newLineRate}
                    onChange={(e) => setNewLineRate(e.target.value)}
                    className="w-24"
                    placeholder="Rate"
                  />
                </>
              )}
              <Button size="sm" onClick={handleAddLine}>
                Add Line
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No lines added
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((line) => {
                  const part = line.part_id ? parts.find((p) => p.id === line.part_id) : null;
                  return (
                    <TableRow key={line.id}>
                      <TableCell>{line.description || part?.part_number || '—'}</TableCell>
                      <TableCell>{line.quantity ?? '—'}</TableCell>
                      <TableCell>{line.unit_cost != null ? `$${toNumber(line.unit_cost).toFixed(2)}` : '—'}</TableCell>
                      <TableCell>{line.labor_hours ?? '—'}</TableCell>
                      <TableCell>{line.labor_rate != null ? `$${toNumber(line.labor_rate).toFixed(2)}` : '—'}</TableCell>
                      <TableCell>{line.amount != null ? `$${toNumber(line.amount).toFixed(2)}` : '—'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeWarrantyClaimLine(line.id)}>
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end gap-4 text-sm">
          <div className="text-right">
            <p className="text-muted-foreground">Total Requested</p>
            <p className="font-semibold">${toNumber(totalRequested).toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Approved</p>
            <p className="font-semibold">
              {claim.approved_amount != null ? `$${toNumber(claim.approved_amount).toFixed(2)}` : '—'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
