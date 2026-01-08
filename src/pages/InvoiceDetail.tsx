import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRepos } from '@/repos';
import type { Invoice, InvoiceLine } from '@/types';

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

export default function InvoiceDetail() {
  const { id: invoiceId } = useParams<{ id: string }>();
  const repos = useRepos();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const backTo = invoice
    ? invoice.source_type === 'SALES_ORDER'
      ? `/sales-orders/${invoice.source_id}`
      : invoice.source_type === 'WORK_ORDER'
        ? `/work-orders/${invoice.source_id}`
        : '/invoices'
    : '/invoices';

  useEffect(() => {
    if (!invoiceId) return;

    const loadInvoice = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const invoiceData = await repos.invoices.getById({ invoiceId });
        const invoiceLines = await repos.invoices.listLines({ invoiceId });
        setInvoice(invoiceData);
        setLines(invoiceLines);
      } catch (error) {
        setNotFound(true);
        setInvoice(null);
        setLines([]);
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [invoiceId, repos.invoices]);

  if (loading) {
    return (
      <div className="page-container">
        <PageHeader title="Invoice" backTo={backTo} />
        <p>Loading...</p>
      </div>
    );
  }

  if (notFound || !invoice) {
    return (
      <div className="page-container">
        <PageHeader title="Invoice" backTo={backTo} />
        <p>Invoice not found</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader title={`Invoice ${invoice.invoice_number}`} backTo={backTo} />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Status:</span>
              <Badge variant="outline">{invoice.status}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Total:</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Balance Due:</span>
              <span>{formatCurrency(invoice.balance_due)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No lines found
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.description}</TableCell>
                      <TableCell>{line.qty}</TableCell>
                      <TableCell>{formatCurrency(line.unit_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(line.amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
