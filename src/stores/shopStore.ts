import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  SystemSettings,
  Customer,
  Unit,
  Vendor,
  PartCategory,
  Part,
  SalesOrder,
  SalesOrderLine,
  WorkOrder,
  WorkOrderPartLine,
  WorkOrderLaborLine,
} from '@/types';

// Generate unique IDs
const generateId = () => crypto.randomUUID();

// Generate order numbers
const generateOrderNumber = (prefix: string, count: number) => 
  `${prefix}-${String(count + 1).padStart(6, '0')}`;

interface ShopState {
  // System Settings
  settings: SystemSettings;
  updateSettings: (settings: Partial<SystemSettings>) => void;

  // Customers
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'is_active' | 'created_at' | 'updated_at'>) => Customer;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deactivateCustomer: (id: string) => boolean;

  // Units
  units: Unit[];
  addUnit: (unit: Omit<Unit, 'id' | 'is_active' | 'created_at' | 'updated_at'>) => Unit;
  updateUnit: (id: string, unit: Partial<Unit>) => void;
  deactivateUnit: (id: string) => void;
  getUnitsByCustomer: (customerId: string) => Unit[];

  // Vendors
  vendors: Vendor[];
  addVendor: (vendor: Omit<Vendor, 'id' | 'is_active' | 'created_at' | 'updated_at'>) => Vendor;
  updateVendor: (id: string, vendor: Partial<Vendor>) => void;
  deactivateVendor: (id: string) => void;

  // Part Categories
  categories: PartCategory[];
  addCategory: (category: Omit<PartCategory, 'id' | 'is_active' | 'created_at' | 'updated_at'>) => PartCategory;
  updateCategory: (id: string, category: Partial<PartCategory>) => void;
  deactivateCategory: (id: string) => void;

  // Parts
  parts: Part[];
  addPart: (part: Omit<Part, 'id' | 'is_active' | 'created_at' | 'updated_at'>) => Part;
  updatePart: (id: string, part: Partial<Part>) => void;
  deactivatePart: (id: string) => void;

  // Sales Orders
  salesOrders: SalesOrder[];
  salesOrderLines: SalesOrderLine[];
  createSalesOrder: (customerId: string, unitId: string | null) => SalesOrder;
  soAddPartLine: (orderId: string, partId: string, qty: number) => { success: boolean; error?: string };
  soUpdatePartQty: (lineId: string, newQty: number) => { success: boolean; error?: string };
  soRemovePartLine: (lineId: string) => { success: boolean; error?: string };
  soInvoice: (orderId: string) => { success: boolean; error?: string };
  updateSalesOrderNotes: (orderId: string, notes: string | null) => void;
  getSalesOrderLines: (orderId: string) => SalesOrderLine[];

  // Work Orders
  workOrders: WorkOrder[];
  workOrderPartLines: WorkOrderPartLine[];
  workOrderLaborLines: WorkOrderLaborLine[];
  createWorkOrder: (customerId: string, unitId: string) => WorkOrder;
  woAddPartLine: (orderId: string, partId: string, qty: number) => { success: boolean; error?: string };
  woUpdatePartQty: (lineId: string, newQty: number) => { success: boolean; error?: string };
  woRemovePartLine: (lineId: string) => { success: boolean; error?: string };
  woAddLaborLine: (orderId: string, description: string, hours: number) => { success: boolean; error?: string };
  woUpdateLaborLine: (lineId: string, description: string, hours: number) => { success: boolean; error?: string };
  woRemoveLaborLine: (lineId: string) => { success: boolean; error?: string };
  woUpdateStatus: (orderId: string, status: 'IN_PROGRESS') => { success: boolean; error?: string };
  woInvoice: (orderId: string) => { success: boolean; error?: string };
  updateWorkOrderNotes: (orderId: string, notes: string | null) => void;
  getWorkOrderPartLines: (orderId: string) => WorkOrderPartLine[];
  getWorkOrderLaborLines: (orderId: string) => WorkOrderLaborLine[];
  recalculateSalesOrderTotals: (orderId: string) => void;
  recalculateWorkOrderTotals: (orderId: string) => void;
}

const now = () => new Date().toISOString();

// Walk-in customer
const WALKIN_CUSTOMER: Customer = {
  id: 'walkin',
  company_name: 'Walk-in Customer',
  contact_name: null,
  phone: null,
  email: null,
  address: null,
  notes: 'Default walk-in customer for counter sales',
  is_active: true,
  created_at: now(),
  updated_at: now(),
};

export const useShopStore = create<ShopState>()(
  persist(
    (set, get) => ({
      // Initial Settings
      settings: {
        id: '1',
        shop_name: 'Heavy-Duty Repair Shop',
        default_labor_rate: 125.00,
        default_tax_rate: 8.25,
        currency: 'USD',
        units: 'imperial',
      },

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      // Customers
      customers: [WALKIN_CUSTOMER],

      addCustomer: (customer) => {
        const newCustomer: Customer = {
          ...customer,
          id: generateId(),
          is_active: true,
          created_at: now(),
          updated_at: now(),
        };
        set((state) => ({
          customers: [...state.customers, newCustomer],
        }));
        return newCustomer;
      },

      updateCustomer: (id, customer) =>
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id ? { ...c, ...customer, updated_at: now() } : c
          ),
        })),

      deactivateCustomer: (id) => {
        const state = get();
        // Check for active orders
        const hasActiveOrders =
          state.salesOrders.some((o) => o.customer_id === id && o.status !== 'INVOICED') ||
          state.workOrders.some((o) => o.customer_id === id && o.status !== 'INVOICED');
        
        if (hasActiveOrders) {
          return false;
        }
        
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id ? { ...c, is_active: false, updated_at: now() } : c
          ),
        }));
        return true;
      },

      // Units
      units: [],

      addUnit: (unit) => {
        const newUnit: Unit = {
          ...unit,
          id: generateId(),
          is_active: true,
          created_at: now(),
          updated_at: now(),
        };
        set((state) => ({
          units: [...state.units, newUnit],
        }));
        return newUnit;
      },

      updateUnit: (id, unit) =>
        set((state) => ({
          units: state.units.map((u) =>
            u.id === id ? { ...u, ...unit, updated_at: now() } : u
          ),
        })),

      deactivateUnit: (id) =>
        set((state) => ({
          units: state.units.map((u) =>
            u.id === id ? { ...u, is_active: false, updated_at: now() } : u
          ),
        })),

      getUnitsByCustomer: (customerId) =>
        get().units.filter((u) => u.customer_id === customerId && u.is_active),

      // Vendors
      vendors: [],

      addVendor: (vendor) => {
        const newVendor: Vendor = {
          ...vendor,
          id: generateId(),
          is_active: true,
          created_at: now(),
          updated_at: now(),
        };
        set((state) => ({
          vendors: [...state.vendors, newVendor],
        }));
        return newVendor;
      },

      updateVendor: (id, vendor) =>
        set((state) => ({
          vendors: state.vendors.map((v) =>
            v.id === id ? { ...v, ...vendor, updated_at: now() } : v
          ),
        })),

      deactivateVendor: (id) =>
        set((state) => ({
          vendors: state.vendors.map((v) =>
            v.id === id ? { ...v, is_active: false, updated_at: now() } : v
          ),
        })),

      // Categories
      categories: [],

      addCategory: (category) => {
        const newCategory: PartCategory = {
          ...category,
          id: generateId(),
          is_active: true,
          created_at: now(),
          updated_at: now(),
        };
        set((state) => ({
          categories: [...state.categories, newCategory],
        }));
        return newCategory;
      },

      updateCategory: (id, category) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...category, updated_at: now() } : c
          ),
        })),

      deactivateCategory: (id) =>
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, is_active: false, updated_at: now() } : c
          ),
        })),

      // Parts
      parts: [],

      addPart: (part) => {
        const newPart: Part = {
          ...part,
          id: generateId(),
          is_active: true,
          created_at: now(),
          updated_at: now(),
        };
        set((state) => ({
          parts: [...state.parts, newPart],
        }));
        return newPart;
      },

      updatePart: (id, part) =>
        set((state) => ({
          parts: state.parts.map((p) =>
            p.id === id ? { ...p, ...part, updated_at: now() } : p
          ),
        })),

      deactivatePart: (id) =>
        set((state) => ({
          parts: state.parts.map((p) =>
            p.id === id ? { ...p, is_active: false, updated_at: now() } : p
          ),
        })),

      // Sales Orders
      salesOrders: [],
      salesOrderLines: [],

      createSalesOrder: (customerId, unitId) => {
        const state = get();
        const newOrder: SalesOrder = {
          id: generateId(),
          order_number: generateOrderNumber('SO', state.salesOrders.length),
          customer_id: customerId,
          unit_id: unitId,
          status: 'OPEN',
          notes: null,
          tax_rate: state.settings.default_tax_rate,
          subtotal: 0,
          tax_amount: 0,
          total: 0,
          invoiced_at: null,
          created_at: now(),
          updated_at: now(),
        };
        set((state) => ({
          salesOrders: [...state.salesOrders, newOrder],
        }));
        return newOrder;
      },

      soAddPartLine: (orderId, partId, qty) => {
        const state = get();
        const order = state.salesOrders.find((o) => o.id === orderId);
        
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Cannot modify invoiced order' };
        
        const part = state.parts.find((p) => p.id === partId);
        if (!part) return { success: false, error: 'Part not found' };

        // Check for existing line (merge)
        const existingLine = state.salesOrderLines.find(
          (l) => l.sales_order_id === orderId && l.part_id === partId
        );

        if (existingLine) {
          // Merge quantities
          const newQty = existingLine.quantity + qty;
          const lineTotal = newQty * existingLine.unit_price;
          
          set((state) => ({
            salesOrderLines: state.salesOrderLines.map((l) =>
              l.id === existingLine.id
                ? { ...l, quantity: newQty, line_total: lineTotal, updated_at: now() }
                : l
            ),
            parts: state.parts.map((p) =>
              p.id === partId
                ? { ...p, quantity_on_hand: p.quantity_on_hand - qty, updated_at: now() }
                : p
            ),
          }));
        } else {
          // Create new line
          const newLine: SalesOrderLine = {
            id: generateId(),
            sales_order_id: orderId,
            part_id: partId,
            quantity: qty,
            unit_price: part.selling_price, // Snapshot price
            line_total: qty * part.selling_price,
            created_at: now(),
            updated_at: now(),
          };

          set((state) => ({
            salesOrderLines: [...state.salesOrderLines, newLine],
            parts: state.parts.map((p) =>
              p.id === partId
                ? { ...p, quantity_on_hand: p.quantity_on_hand - qty, updated_at: now() }
                : p
            ),
          }));
        }

        // Recalculate order totals
        get().recalculateSalesOrderTotals(orderId);
        return { success: true };
      },

      soUpdatePartQty: (lineId, newQty) => {
        const state = get();
        const line = state.salesOrderLines.find((l) => l.id === lineId);
        if (!line) return { success: false, error: 'Line not found' };

        const order = state.salesOrders.find((o) => o.id === line.sales_order_id);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Cannot modify invoiced order' };

        const delta = line.quantity - newQty;
        const lineTotal = newQty * line.unit_price;

        set((state) => ({
          salesOrderLines: state.salesOrderLines.map((l) =>
            l.id === lineId
              ? { ...l, quantity: newQty, line_total: lineTotal, updated_at: now() }
              : l
          ),
          parts: state.parts.map((p) =>
            p.id === line.part_id
              ? { ...p, quantity_on_hand: p.quantity_on_hand + delta, updated_at: now() }
              : p
          ),
        }));

        get().recalculateSalesOrderTotals(line.sales_order_id);
        return { success: true };
      },

      soRemovePartLine: (lineId) => {
        const state = get();
        const line = state.salesOrderLines.find((l) => l.id === lineId);
        if (!line) return { success: false, error: 'Line not found' };

        const order = state.salesOrders.find((o) => o.id === line.sales_order_id);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Cannot modify invoiced order' };

        set((state) => ({
          salesOrderLines: state.salesOrderLines.filter((l) => l.id !== lineId),
          parts: state.parts.map((p) =>
            p.id === line.part_id
              ? { ...p, quantity_on_hand: p.quantity_on_hand + line.quantity, updated_at: now() }
              : p
          ),
        }));

        get().recalculateSalesOrderTotals(line.sales_order_id);
        return { success: true };
      },

      soInvoice: (orderId) => {
        const state = get();
        const order = state.salesOrders.find((o) => o.id === orderId);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Order already invoiced' };

        set((state) => ({
          salesOrders: state.salesOrders.map((o) =>
            o.id === orderId
              ? { ...o, status: 'INVOICED', invoiced_at: now(), updated_at: now() }
              : o
          ),
        }));
        return { success: true };
      },

      getSalesOrderLines: (orderId) =>
        get().salesOrderLines.filter((l) => l.sales_order_id === orderId),

      updateSalesOrderNotes: (orderId, notes) =>
        set((state) => ({
          salesOrders: state.salesOrders.map((o) =>
            o.id === orderId ? { ...o, notes, updated_at: now() } : o
          ),
        })),

      recalculateSalesOrderTotals: (orderId: string) => {
        const state = get();
        const lines = state.salesOrderLines.filter((l) => l.sales_order_id === orderId);
        const subtotal = lines.reduce((sum, l) => sum + l.line_total, 0);
        const order = state.salesOrders.find((o) => o.id === orderId);
        if (!order) return;
        
        const tax_amount = subtotal * (order.tax_rate / 100);
        const total = subtotal + tax_amount;

        set((state) => ({
          salesOrders: state.salesOrders.map((o) =>
            o.id === orderId
              ? { ...o, subtotal, tax_amount, total, updated_at: now() }
              : o
          ),
        }));
      },

      // Work Orders
      workOrders: [],
      workOrderPartLines: [],
      workOrderLaborLines: [],

      createWorkOrder: (customerId, unitId) => {
        const state = get();
        const newOrder: WorkOrder = {
          id: generateId(),
          order_number: generateOrderNumber('WO', state.workOrders.length),
          customer_id: customerId,
          unit_id: unitId,
          status: 'OPEN',
          notes: null,
          tax_rate: state.settings.default_tax_rate,
          parts_subtotal: 0,
          labor_subtotal: 0,
          subtotal: 0,
          tax_amount: 0,
          total: 0,
          invoiced_at: null,
          created_at: now(),
          updated_at: now(),
        };
        set((state) => ({
          workOrders: [...state.workOrders, newOrder],
        }));
        return newOrder;
      },

      woAddPartLine: (orderId, partId, qty) => {
        const state = get();
        const order = state.workOrders.find((o) => o.id === orderId);
        
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Cannot modify invoiced order' };
        
        const part = state.parts.find((p) => p.id === partId);
        if (!part) return { success: false, error: 'Part not found' };

        const existingLine = state.workOrderPartLines.find(
          (l) => l.work_order_id === orderId && l.part_id === partId
        );

        if (existingLine) {
          const newQty = existingLine.quantity + qty;
          const lineTotal = newQty * existingLine.unit_price;
          
          set((state) => ({
            workOrderPartLines: state.workOrderPartLines.map((l) =>
              l.id === existingLine.id
                ? { ...l, quantity: newQty, line_total: lineTotal, updated_at: now() }
                : l
            ),
            parts: state.parts.map((p) =>
              p.id === partId
                ? { ...p, quantity_on_hand: p.quantity_on_hand - qty, updated_at: now() }
                : p
            ),
          }));
        } else {
          const newLine: WorkOrderPartLine = {
            id: generateId(),
            work_order_id: orderId,
            part_id: partId,
            quantity: qty,
            unit_price: part.selling_price,
            line_total: qty * part.selling_price,
            created_at: now(),
            updated_at: now(),
          };

          set((state) => ({
            workOrderPartLines: [...state.workOrderPartLines, newLine],
            parts: state.parts.map((p) =>
              p.id === partId
                ? { ...p, quantity_on_hand: p.quantity_on_hand - qty, updated_at: now() }
                : p
            ),
          }));
        }

        get().recalculateWorkOrderTotals(orderId);
        return { success: true };
      },

      woUpdatePartQty: (lineId, newQty) => {
        const state = get();
        const line = state.workOrderPartLines.find((l) => l.id === lineId);
        if (!line) return { success: false, error: 'Line not found' };

        const order = state.workOrders.find((o) => o.id === line.work_order_id);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Cannot modify invoiced order' };

        const delta = line.quantity - newQty;
        const lineTotal = newQty * line.unit_price;

        set((state) => ({
          workOrderPartLines: state.workOrderPartLines.map((l) =>
            l.id === lineId
              ? { ...l, quantity: newQty, line_total: lineTotal, updated_at: now() }
              : l
          ),
          parts: state.parts.map((p) =>
            p.id === line.part_id
              ? { ...p, quantity_on_hand: p.quantity_on_hand + delta, updated_at: now() }
              : p
          ),
        }));

        get().recalculateWorkOrderTotals(line.work_order_id);
        return { success: true };
      },

      woRemovePartLine: (lineId) => {
        const state = get();
        const line = state.workOrderPartLines.find((l) => l.id === lineId);
        if (!line) return { success: false, error: 'Line not found' };

        const order = state.workOrders.find((o) => o.id === line.work_order_id);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Cannot modify invoiced order' };

        set((state) => ({
          workOrderPartLines: state.workOrderPartLines.filter((l) => l.id !== lineId),
          parts: state.parts.map((p) =>
            p.id === line.part_id
              ? { ...p, quantity_on_hand: p.quantity_on_hand + line.quantity, updated_at: now() }
              : p
          ),
        }));

        get().recalculateWorkOrderTotals(line.work_order_id);
        return { success: true };
      },

      woAddLaborLine: (orderId, description, hours) => {
        const state = get();
        const order = state.workOrders.find((o) => o.id === orderId);
        
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Cannot modify invoiced order' };

        const rate = state.settings.default_labor_rate; // Snapshot rate
        const newLine: WorkOrderLaborLine = {
          id: generateId(),
          work_order_id: orderId,
          description,
          hours,
          rate,
          line_total: hours * rate,
          created_at: now(),
          updated_at: now(),
        };

        set((state) => ({
          workOrderLaborLines: [...state.workOrderLaborLines, newLine],
        }));

        get().recalculateWorkOrderTotals(orderId);
        return { success: true };
      },

      woUpdateLaborLine: (lineId, description, hours) => {
        const state = get();
        const line = state.workOrderLaborLines.find((l) => l.id === lineId);
        if (!line) return { success: false, error: 'Line not found' };

        const order = state.workOrders.find((o) => o.id === line.work_order_id);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Cannot modify invoiced order' };

        set((state) => ({
          workOrderLaborLines: state.workOrderLaborLines.map((l) =>
            l.id === lineId
              ? { ...l, description, hours, line_total: hours * l.rate, updated_at: now() }
              : l
          ),
        }));

        get().recalculateWorkOrderTotals(line.work_order_id);
        return { success: true };
      },

      woRemoveLaborLine: (lineId) => {
        const state = get();
        const line = state.workOrderLaborLines.find((l) => l.id === lineId);
        if (!line) return { success: false, error: 'Line not found' };

        const order = state.workOrders.find((o) => o.id === line.work_order_id);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Cannot modify invoiced order' };

        set((state) => ({
          workOrderLaborLines: state.workOrderLaborLines.filter((l) => l.id !== lineId),
        }));

        get().recalculateWorkOrderTotals(line.work_order_id);
        return { success: true };
      },

      woUpdateStatus: (orderId, status) => {
        const state = get();
        const order = state.workOrders.find((o) => o.id === orderId);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Cannot modify invoiced order' };
        if (order.status === 'IN_PROGRESS' && status === 'IN_PROGRESS') {
          return { success: false, error: 'Order already in progress' };
        }

        set((state) => ({
          workOrders: state.workOrders.map((o) =>
            o.id === orderId ? { ...o, status, updated_at: now() } : o
          ),
        }));
        return { success: true };
      },

      woInvoice: (orderId) => {
        const state = get();
        const order = state.workOrders.find((o) => o.id === orderId);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Order already invoiced' };

        set((state) => ({
          workOrders: state.workOrders.map((o) =>
            o.id === orderId
              ? { ...o, status: 'INVOICED', invoiced_at: now(), updated_at: now() }
              : o
          ),
        }));
        return { success: true };
      },

      getWorkOrderPartLines: (orderId) =>
        get().workOrderPartLines.filter((l) => l.work_order_id === orderId),

      getWorkOrderLaborLines: (orderId) =>
        get().workOrderLaborLines.filter((l) => l.work_order_id === orderId),

      updateWorkOrderNotes: (orderId, notes) =>
        set((state) => ({
          workOrders: state.workOrders.map((o) =>
            o.id === orderId ? { ...o, notes, updated_at: now() } : o
          ),
        })),

      recalculateWorkOrderTotals: (orderId: string) => {
        const state = get();
        const partLines = state.workOrderPartLines.filter((l) => l.work_order_id === orderId);
        const laborLines = state.workOrderLaborLines.filter((l) => l.work_order_id === orderId);
        
        const parts_subtotal = partLines.reduce((sum, l) => sum + l.line_total, 0);
        const labor_subtotal = laborLines.reduce((sum, l) => sum + l.line_total, 0);
        const subtotal = parts_subtotal + labor_subtotal;
        
        const order = state.workOrders.find((o) => o.id === orderId);
        if (!order) return;
        
        const tax_amount = subtotal * (order.tax_rate / 100);
        const total = subtotal + tax_amount;

        set((state) => ({
          workOrders: state.workOrders.map((o) =>
            o.id === orderId
              ? { ...o, parts_subtotal, labor_subtotal, subtotal, tax_amount, total, updated_at: now() }
              : o
          ),
        }));
      },
    }),
    {
      name: 'shop-storage',
    }
  )
);
