import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { fetchAllPayments, computePaymentSummary } from '@/integrations/supabase/payments';
import type { InvoiceRow, PaymentMethod, PaymentStatus } from '@/types';
import { useRepos } from '@/repos';
import { useOrderPayments } from '@/hooks/usePayments';

const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Credit Card' },
  { value: 'ach', label: 'ACH' },
  { value: 'other', label: 'Other' },
];

const toNumber = (value: number | string | null | undefined) => {
  const numeric = typeof value === 'number' ? value : value != null ? Number(value) : NaN;
  return Number.isFinite(numeric) ? numeric : 0;
};
const formatMoney = (value: number | string | null | undefined) => toNumber(value).toFixed(2);

export default function InvoiceRegistry() {
  const repos = useRepos();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { salesOrders } = repos.salesOrders;
  const { workOrders } = repos.workOrders;
  const { customers } = repos.customers;

  const invoicedSalesOrders = useMemo(
    () => salesOrders.filter((so) => so.status === 'INVOICED'),
    [salesOrders]
  );
  const invoicedWorkOrders = useMemo(
    () => workOrders.filter((wo) => wo.status === 'INVOICED'),
    [workOrders]
  );

  const paymentsQuery = useQuery({
    queryKey: ['payments-ledger-all'],
    queryFn: () => fetchAllPayments({ includeVoided: true }),
  });

  const paymentsByOrder = useMemo(() => {
    const map = new Map<string, { totalPaid: number; paymentStatus: PaymentStatus; balanceDue: number }>();
    const payments = paymentsQuery.data ?? [];
    const grouped = payments.reduce<Record<string, typeof payments>>((acc, payment) => {
      const key = `${payment.order_type}:${payment.order_id}`;
      acc[key] = acc[key] || [];
      acc[key].push(payment);
      return acc;
    }, {});
    Object.entries(grouped).forEach(([key, list]) => {
      const orderTotal = 0; // will be recalculated per row when needed
      const summary = computePaymentSummary(list, orderTotal);
      map.set(key, summary);
    });
    return map;
  }, [paymentsQuery.data]);

  const invoiceRows: InvoiceRow[] = useMemo(() => {
    const salesRows: InvoiceRow[] = invoicedSalesOrders.map((order) => {
      const customerName =
        customers.find((c) => c.id === order.customer_id)?.company_name ??
        order.customer?.company_name ??
        'Customer';
      const key = `SALES_ORDER:${order.id}`;
      const paymentSummary = computePaymentSummary(
        (paymentsQuery.data ?? []).filter((p) => p.order_type === 'SALES_ORDER' && p.order_id === order.id),
        toNumber(order.total)
      );
      return {
        orderType: 'SALES_ORDER',
        orderId: order.id,
        invoiceNumber: order.order_number,
        customerName,
        invoiceDate: order.invoiced_at || order.created_at,
        orderTotal: toNumber(order.total),
        totalPaid: paymentSummary.totalPaid,
        balanceDue: paymentSummary.balanceDue,
        paymentStatus: paymentSummary.status,
      };
    });

    const workRows: InvoiceRow[] = invoicedWorkOrders.map((order) => {
      const customerName =
        customers.find((c) => c.id === order.customer_id)?.company_name ??
        order.customer?.company_name ??
        'Customer';
      const paymentSummary = computePaymentSummary(
        (paymentsQuery.data ?? []).filter((p) => p.order_type === 'WORK_ORDER' && p.order_id === order.id),
        toNumber(order.total)
      );
      return {
        orderType: 'WORK_ORDER',
        orderId: order.id,
        invoiceNumber: order.order_number,
        customerName,
        invoiceDate: order.invoiced_at || order.created_at,
        orderTotal: toNumber(order.total),
        totalPaid: paymentSummary.totalPaid,
        balanceDue: paymentSummary.balanceDue,
        paymentStatus: paymentSummary.status,
      };
    });

    return [...salesRows, ...workRows].sort(
      (a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
    );
  }, [customers, invoicedSalesOrders, invoicedWorkOrders, paymentsQuery.data]);

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const {
    addPayment,
    addPaymentMutation,
  } = useOrderPayments(
    selectedInvoice?.orderType ?? 'SALES_ORDER',
    selectedInvoice?.orderId,
    selectedInvoice?.orderTotal ?? 0
  );

  const handleOpenPayment = (row: InvoiceRow) => {
    setSelectedInvoice(row);
    setPaymentAmount(row.balanceDue > 0 ? row.balanceDue.toString() : '');
    setPaymentMethod('cash');
    setPaymentReference('');
    setPaymentNotes('');
  };

  const handleSavePayment = () => {
    if (!selectedInvoice) return;
    const amount = toNumber(paymentAmount);
    if (amount <= 0) return;
    addPayment(
      {
        orderType: selectedInvoice.orderType,
        orderId: selectedInvoice.orderId,
        amount,
        method: paymentMethod,
        reference: paymentReference || null,
        notes: paymentNotes || null,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['payments-ledger-all'] });
          setSelectedInvoice(null);
          setPaymentAmount('');
          setPaymentReference('');
          setPaymentNotes('');
        },
      }
    );
  };

  const paymentStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-green-100 text-green-700" variant="outline">PAID</Badge>;
      case 'OVERPAID':
        return <Badge className="bg-amber-100 text-amber-800" variant="outline">OVERPAID</Badge>;
      case 'PARTIAL':
        return <Badge className="bg-orange-100 text-orange-700" variant="outline">PARTIAL</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700" variant="outline">UNPAID</Badge>;
    }
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader title="Invoice Registry" subtitle="Sales and work orders that have been invoiced" />

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{invoiceRows.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Billed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              ${formatMoney(invoiceRows.reduce((sum, row) => sum + row.orderTotal, 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              ${formatMoney(invoiceRows.reduce((sum, row) => sum + row.totalPaid, 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Balance Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              ${formatMoney(invoiceRows.reduce((sum, row) => sum + row.balanceDue, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoiceRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-4">
                  No invoices yet.
                </TableCell>
              </TableRow>
            )}
            {invoiceRows.map((row) => (
              <TableRow key={`${row.orderType}-${row.orderId}`}>
                <TableCell>
                  <Link
                    to={
                      row.orderType === 'WORK_ORDER'
                        ? `/work-orders/${row.orderId}`
                        : `/sales-orders/${row.orderId}`
                    }
                    className="text-primary hover:underline"
                  >
                    {row.invoiceNumber}
                  </Link>
                </TableCell>
                <TableCell>{row.customerName}</TableCell>
                <TableCell>{row.orderType === 'WORK_ORDER' ? 'Work Order' : 'Sales Order'}</TableCell>
                <TableCell>{new Date(row.invoiceDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">${formatMoney(row.orderTotal)}</TableCell>
                <TableCell className="text-right">${formatMoney(row.totalPaid)}</TableCell>
                <TableCell className="text-right">${formatMoney(row.balanceDue)}</TableCell>
                <TableCell className="text-right">{paymentStatusBadge(row.paymentStatus)}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => navigate(
                    row.orderType === 'WORK_ORDER'
                      ? `/work-orders/${row.orderId}`
                      : `/sales-orders/${row.orderId}`
                  )}>
                    View
                  </Button>
                  <Button size="sm" onClick={() => handleOpenPayment(row)}>
                    Receive Payment
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Receive Payment — {selectedInvoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Reference (optional)"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
            />
            <Input
              placeholder="Notes (optional)"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
            />
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
              Cancel
            </Button>
            <Button onClick={handleSavePayment} disabled={addPaymentMutation.isLoading}>
              {addPaymentMutation.isLoading ? 'Saving...' : 'Save Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
