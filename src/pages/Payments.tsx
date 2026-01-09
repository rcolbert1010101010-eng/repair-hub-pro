import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { fetchAllPayments, type PaymentsFilter } from '@/integrations/supabase/payments';
import type { Payment, PaymentMethod, PaymentOrderType } from '@/types';

const ORDER_TYPE_OPTIONS: Array<{ value: PaymentOrderType | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Orders' },
  { value: 'WORK_ORDER', label: 'Work Orders' },
  { value: 'SALES_ORDER', label: 'Sales Orders' },
];

const METHOD_OPTIONS: Array<{ value: PaymentMethod | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Methods' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Credit Card' },
  { value: 'ach', label: 'ACH' },
  { value: 'other', label: 'Other' },
];

type StatusFilter = 'all' | 'active' | 'voided';

const toNumber = (value: number | string | null | undefined) => {
  const numeric = typeof value === 'number' ? value : value != null ? Number(value) : NaN;
  return Number.isFinite(numeric) ? numeric : 0;
};
const formatMoney = (value: number | string | null | undefined) => toNumber(value).toFixed(2);

export default function PaymentsPage() {
  const [orderTypeFilter, setOrderTypeFilter] = useState<PaymentOrderType | 'ALL'>('ALL');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const queryFilter: PaymentsFilter = useMemo(
    () => ({
      orderType: orderTypeFilter === 'ALL' ? undefined : orderTypeFilter,
      method: methodFilter === 'ALL' ? undefined : methodFilter,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      includeVoided: statusFilter !== 'active',
    }),
    [orderTypeFilter, methodFilter, startDate, endDate, statusFilter]
  );

  const paymentsQuery = useQuery({
    queryKey: ['payments-ledger', queryFilter],
    queryFn: () => fetchAllPayments(queryFilter),
  });

  const payments = useMemo(() => {
    const data = paymentsQuery.data ?? [];
    if (statusFilter === 'voided') return data.filter((p) => p.voided_at);
    if (statusFilter === 'active') return data.filter((p) => !p.voided_at);
    return data;
  }, [paymentsQuery.data, statusFilter]);

  const summary = useMemo(() => {
    const active = payments.filter((p) => !p.voided_at);
    const voided = payments.filter((p) => p.voided_at);
    const totalAmount = active.reduce((sum, p) => sum + toNumber(p.amount), 0);
    return {
      count: payments.length,
      activeCount: active.length,
      voidedCount: voided.length,
      totalAmount,
    };
  }, [payments]);

  const getOrderLink = (payment: Payment) =>
    payment.order_type === 'WORK_ORDER' ? `/work-orders/${payment.order_id}` : `/sales-orders/${payment.order_id}`;

  const statusBadge = (payment: Payment) => {
    if (payment.voided_at) {
      return <Badge variant="outline" className="bg-destructive/10 text-destructive">Voided</Badge>;
    }
    return <Badge variant="outline" className="bg-green-100 text-green-700">Active</Badge>;
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader title="Payments" subtitle="Track payments across work and sales orders" />

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Voided</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.voidedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">${formatMoney(summary.totalAmount)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Select value={orderTypeFilter} onValueChange={(value) => setOrderTypeFilter(value as typeof orderTypeFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Order Type" />
          </SelectTrigger>
          <SelectContent>
            {ORDER_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={methodFilter} onValueChange={(value) => setMethodFilter(value as typeof methodFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Payment Method" />
          </SelectTrigger>
          <SelectContent>
            {METHOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="voided">Voided</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>

        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentsQuery.isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
                  Loading payments...
                </TableCell>
              </TableRow>
            )}
            {!paymentsQuery.isLoading && payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
                  No payments found.
                </TableCell>
              </TableRow>
            )}
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>{new Date(payment.created_at).toLocaleString()}</TableCell>
                <TableCell>
                  <Link to={getOrderLink(payment)} className="text-primary hover:underline">
                    {payment.order_type === 'WORK_ORDER' ? 'Work Order' : 'Sales Order'} {payment.order_id}
                  </Link>
                </TableCell>
                <TableCell>{payment.order_type === 'WORK_ORDER' ? 'Work Order' : 'Sales Order'}</TableCell>
                <TableCell className="capitalize">{payment.method}</TableCell>
                <TableCell>{payment.reference || '—'}</TableCell>
                <TableCell className="max-w-xs truncate">{payment.notes || '—'}</TableCell>
                <TableCell className="text-right font-semibold">
                  ${formatMoney(payment.amount)}
                </TableCell>
                <TableCell className="text-right">{statusBadge(payment)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
