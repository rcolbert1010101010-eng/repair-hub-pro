import { useSyncExternalStore } from 'react';

import { useShopStore } from '@/stores/shopStore';

import type { Repos } from './repos';
import { zustandRepos } from './zustandRepos';
import { settingsRepoApi } from './api/settingsRepoApi';
import { customersRepoApi } from './api/customersRepoApi';
import { unitsRepoApi } from './api/unitsRepoApi';
import { vendorsRepoApi } from './api/vendorsRepoApi';
import { categoriesRepoApi } from './api/categoriesRepoApi';
import { partsRepoApi } from './api/partsRepoApi';
import { techniciansRepoApi } from './api/techniciansRepoApi';

// In-memory storage for invoices
const invoicesStore = new Map<string, import('@/types').Invoice>();
const invoiceLinesStore = new Map<string, import('@/types').InvoiceLine[]>();
let invoiceCounter = 0;

const apiBackedRepos: Repos = {
  ...zustandRepos,
  settings: settingsRepoApi,
  customers: customersRepoApi,
  customerContacts: zustandRepos.customerContacts,
  units: unitsRepoApi,
  unitAttachments: zustandRepos.unitAttachments,
  vendors: vendorsRepoApi,
  categories: categoriesRepoApi,
  parts: partsRepoApi,
  technicians: techniciansRepoApi,
  invoices: {
    createFromSalesOrder: async (input: { salesOrderId: string }) => {
      const order = zustandRepos.salesOrders.salesOrders.find((so) => so.id === input.salesOrderId);
      if (!order) {
        throw new Error(`Sales order not found: ${input.salesOrderId}`);
      }

      const lines = zustandRepos.salesOrders.getSalesOrderLines(input.salesOrderId);
      const partLines = lines.filter((line) => !line.is_core_refund_line);

      const subtotal_parts = partLines.reduce((sum, line) => sum + line.line_total, 0);
      const tax_amount = Math.round(subtotal_parts * order.tax_rate * 100) / 100;
      const total = subtotal_parts + tax_amount;

      invoiceCounter += 1;
      const invoice_number = `INV-${String(invoiceCounter).padStart(6, '0')}`;
      const invoiceId = `inv_${Date.now()}_${invoiceCounter}`;

      const invoice: import('@/types').Invoice = {
        id: invoiceId,
        invoice_number,
        source_type: 'SALES_ORDER',
        source_id: input.salesOrderId,
        customer_id: order.customer_id,
        unit_id: order.unit_id ?? null,
        status: 'DRAFT',
        issued_at: null,
        due_at: null,
        subtotal_parts,
        subtotal_labor: 0,
        subtotal_fees: 0,
        tax_amount,
        total,
        balance_due: total,
        snapshot_json: undefined,
      };

      const invoiceLines: import('@/types').InvoiceLine[] = partLines.map((line, idx) => ({
        id: `inv_line_${Date.now()}_${invoiceCounter}_${idx}`,
        invoice_id: invoiceId,
        line_type: 'PART',
        ref_type: 'sales_order_line',
        ref_id: line.id,
        description: line.description ?? (line.part as { name?: string } | undefined)?.name ?? 'Part',
        qty: line.quantity,
        unit_price: line.unit_price,
        amount: line.line_total,
        taxable: true,
        tax_rate: order.tax_rate,
      }));

      invoicesStore.set(invoiceId, invoice);
      invoiceLinesStore.set(invoiceId, invoiceLines);

      zustandRepos.salesOrders.soInvoice(input.salesOrderId);

      return { invoiceId };
    },
    getById: async (input: { invoiceId: string }) => {
      const invoice = invoicesStore.get(input.invoiceId);
      if (!invoice) {
        throw new Error(`Invoice not found: ${input.invoiceId}`);
      }
      return invoice;
    },
    listLines: async (input: { invoiceId: string }) => {
      return invoiceLinesStore.get(input.invoiceId) ?? [];
    },
  },
};

const repos: Repos = apiBackedRepos;

function subscribe(callback: () => void) {
  return useShopStore.subscribe(() => callback());
}

function getSnapshot(): Repos {
  return repos;
}

export function useRepos(): Repos {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export { repos };
