import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calcPartPriceForLevel } from '@/domain/pricing/partPricing';
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
  Technician,
  TimeEntry,
  PurchaseOrder,
  PurchaseOrderLine,
  ReceivingRecord,
  InventoryAdjustment,
  VendorCostHistory,
  UnitPMSchedule,
  UnitPMHistory,
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
  addPart: (part: Omit<Part, 'id' | 'is_active' | 'created_at' | 'updated_at' | 'last_cost' | 'avg_cost'> & Partial<Pick<Part, 'last_cost' | 'avg_cost'>>) => Part;
  updatePart: (id: string, part: Partial<Part>) => void;
  updatePartWithQohAdjustment: (id: string, part: Partial<Part>, meta: { reason: string; adjusted_by: string }) => void;
  deactivatePart: (id: string) => void;

  // Technicians
  technicians: Technician[];
  addTechnician: (technician: Omit<Technician, 'id' | 'created_at' | 'updated_at'> & Partial<Pick<Technician, 'is_active' | 'employment_type' | 'skill_tags' | 'work_schedule' | 'certifications'>>) => Technician;
  updateTechnician: (id: string, technician: Partial<Technician>) => void;
  deactivateTechnician: (id: string) => void;

  // Time Entries
  timeEntries: TimeEntry[];
  clockIn: (technicianId: string, workOrderId: string) => { success: boolean; error?: string };
  clockOut: (technicianId: string) => { success: boolean; error?: string };
  getActiveTimeEntry: (technicianId: string) => TimeEntry | undefined;
  getTimeEntriesByWorkOrder: (workOrderId: string) => TimeEntry[];

  // Sales Orders
  salesOrders: SalesOrder[];
  salesOrderLines: SalesOrderLine[];
  createSalesOrder: (customerId: string, unitId: string | null) => SalesOrder;
  soAddPartLine: (orderId: string, partId: string, qty: number) => { success: boolean; error?: string };
  soUpdatePartQty: (lineId: string, newQty: number) => { success: boolean; error?: string };
  soUpdateLineUnitPrice: (lineId: string, newUnitPrice: number) => { success: boolean; error?: string };
  soRemovePartLine: (lineId: string) => { success: boolean; error?: string };
  soToggleWarranty: (lineId: string) => { success: boolean; error?: string };
  soToggleCoreReturned: (lineId: string) => { success: boolean; error?: string };
  soMarkCoreReturned: (lineId: string) => { success: boolean; error?: string };
  soConvertToOpen: (orderId: string) => { success: boolean; error?: string };
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
  woTogglePartWarranty: (lineId: string) => { success: boolean; error?: string };
  woToggleCoreReturned: (lineId: string) => { success: boolean; error?: string };
  woMarkCoreReturned: (lineId: string) => { success: boolean; error?: string };
  woAddLaborLine: (orderId: string, description: string, hours: number, technicianId?: string) => { success: boolean; error?: string };
  woUpdateLaborLine: (lineId: string, description: string, hours: number) => { success: boolean; error?: string };
  woRemoveLaborLine: (lineId: string) => { success: boolean; error?: string };
  woToggleLaborWarranty: (lineId: string) => { success: boolean; error?: string };
  woUpdateStatus: (orderId: string, status: 'IN_PROGRESS') => { success: boolean; error?: string };
  woInvoice: (orderId: string) => { success: boolean; error?: string };
  updateWorkOrderNotes: (orderId: string, notes: string | null) => void;
  getWorkOrderPartLines: (orderId: string) => WorkOrderPartLine[];
  getWorkOrderLaborLines: (orderId: string) => WorkOrderLaborLine[];
  recalculateSalesOrderTotals: (orderId: string) => void;
  recalculateWorkOrderTotals: (orderId: string) => void;

  // Purchase Orders
  purchaseOrders: PurchaseOrder[];
  purchaseOrderLines: PurchaseOrderLine[];
  receivingRecords: ReceivingRecord[];
  inventoryAdjustments: InventoryAdjustment[];
  vendorCostHistory: VendorCostHistory[];
  createPurchaseOrder: (vendorId: string) => PurchaseOrder;
  poAddLine: (orderId: string, partId: string, quantity: number) => { success: boolean; error?: string };
  poUpdateLineQty: (lineId: string, newQty: number) => { success: boolean; error?: string };
  poRemoveLine: (lineId: string) => { success: boolean; error?: string };
  poReceive: (lineId: string, quantity: number) => { success: boolean; error?: string };
  poClose: (orderId: string) => { success: boolean; error?: string };
  updatePurchaseOrderNotes: (orderId: string, notes: string | null) => void;
  getPurchaseOrderLines: (orderId: string) => PurchaseOrderLine[];
  getReceivingRecords: (lineId: string) => ReceivingRecord[];

  // PM Schedules
  pmSchedules: UnitPMSchedule[];
  pmHistory: UnitPMHistory[];
  addPMSchedule: (schedule: Omit<UnitPMSchedule, 'id' | 'is_active' | 'created_at' | 'updated_at'>) => UnitPMSchedule;
  updatePMSchedule: (id: string, schedule: Partial<UnitPMSchedule>) => void;
  deactivatePMSchedule: (id: string) => void;
  getPMSchedulesByUnit: (unitId: string) => UnitPMSchedule[];
  addPMHistory: (history: Omit<UnitPMHistory, 'id' | 'is_active' | 'created_at'>) => UnitPMHistory;
  getPMHistoryByUnit: (unitId: string) => UnitPMHistory[];
  markPMCompleted: (scheduleId: string, completedDate: string, completedMeter: number | null, notes: string | null) => { success: boolean; error?: string };
}

const now = () => new Date().toISOString();
const staticDate = '2024-01-01T00:00:00.000Z';

// Walk-in customer
const WALKIN_CUSTOMER: Customer = {
  id: 'walkin',
  company_name: 'Walk-in Customer',
  contact_name: null,
  phone: null,
  email: null,
  address: null,
  notes: 'Default walk-in customer for counter sales',
  price_level: 'RETAIL',
  is_active: true,
  created_at: staticDate,
  updated_at: staticDate,
};

// Sample Vendors
const SAMPLE_VENDORS: Vendor[] = [
  { id: 'vendor-1', vendor_name: 'FleetParts Pro', phone: '555-100-1000', email: 'orders@fleetpartspro.com', notes: 'Primary parts supplier', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'vendor-2', vendor_name: 'Diesel Direct', phone: '555-200-2000', email: 'sales@dieseldirect.com', notes: 'Diesel engine parts specialist', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'vendor-3', vendor_name: 'HeavyDuty Supply Co', phone: '555-300-3000', email: 'support@hdsc.com', notes: null, is_active: true, created_at: staticDate, updated_at: staticDate },
];

// Sample Categories
const SAMPLE_CATEGORIES: PartCategory[] = [
  { id: 'cat-1', category_name: 'Brakes', description: 'Brake pads, rotors, calipers, drums', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'cat-2', category_name: 'Engine', description: 'Engine components and filters', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'cat-3', category_name: 'Electrical', description: 'Batteries, starters, alternators', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'cat-4', category_name: 'Suspension', description: 'Shocks, struts, springs', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'cat-5', category_name: 'Fluids & Filters', description: 'Oil, coolant, filters', is_active: true, created_at: staticDate, updated_at: staticDate },
];

// Sample Parts
const SAMPLE_PARTS: Part[] = [
  { id: 'part-1', part_number: 'BRK-001', description: 'Heavy Duty Brake Pad Set (Front)', vendor_id: 'vendor-1', category_id: 'cat-1', cost: 45.00, selling_price: 89.99, quantity_on_hand: 24, core_required: false, core_charge: 0, min_qty: null, max_qty: null, bin_location: null, last_cost: null, avg_cost: null, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-2', part_number: 'BRK-002', description: 'Heavy Duty Brake Pad Set (Rear)', vendor_id: 'vendor-1', category_id: 'cat-1', cost: 42.00, selling_price: 84.99, quantity_on_hand: 18, core_required: false, core_charge: 0, min_qty: null, max_qty: null, bin_location: null, last_cost: null, avg_cost: null, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-3', part_number: 'BRK-010', description: 'Brake Rotor - 15\" HD', vendor_id: 'vendor-1', category_id: 'cat-1', cost: 120.00, selling_price: 189.99, quantity_on_hand: 8, core_required: true, core_charge: 35.00, min_qty: null, max_qty: null, bin_location: null, last_cost: null, avg_cost: null, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-4', part_number: 'ENG-001', description: 'Oil Filter - Heavy Duty', vendor_id: 'vendor-2', category_id: 'cat-2', cost: 8.50, selling_price: 18.99, quantity_on_hand: 50, core_required: false, core_charge: 0, min_qty: null, max_qty: null, bin_location: null, last_cost: null, avg_cost: null, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-5', part_number: 'ENG-002', description: 'Air Filter - Commercial Truck', vendor_id: 'vendor-2', category_id: 'cat-2', cost: 25.00, selling_price: 49.99, quantity_on_hand: 30, core_required: false, core_charge: 0, min_qty: null, max_qty: null, bin_location: null, last_cost: null, avg_cost: null, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-6', part_number: 'ENG-015', description: 'Fuel Injector - Diesel', vendor_id: 'vendor-2', category_id: 'cat-2', cost: 180.00, selling_price: 299.99, quantity_on_hand: 6, core_required: true, core_charge: 75.00, min_qty: null, max_qty: null, bin_location: null, last_cost: null, avg_cost: null, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-7', part_number: 'ELC-001', description: 'Heavy Duty Battery - Group 31', vendor_id: 'vendor-3', category_id: 'cat-3', cost: 145.00, selling_price: 229.99, quantity_on_hand: 12, core_required: true, core_charge: 25.00, min_qty: null, max_qty: null, bin_location: null, last_cost: null, avg_cost: null, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-8', part_number: 'ELC-010', description: 'Starter Motor - Diesel HD', vendor_id: 'vendor-3', category_id: 'cat-3', cost: 280.00, selling_price: 449.99, quantity_on_hand: 4, core_required: true, core_charge: 85.00, min_qty: null, max_qty: null, bin_location: null, last_cost: null, avg_cost: null, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-9', part_number: 'ELC-015', description: 'Alternator - 200A HD', vendor_id: 'vendor-3', category_id: 'cat-3', cost: 195.00, selling_price: 329.99, quantity_on_hand: 5, core_required: true, core_charge: 65.00, min_qty: null, max_qty: null, bin_location: null, last_cost: null, avg_cost: null, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-10', part_number: 'SUS-001', description: 'Shock Absorber - Front HD', vendor_id: 'vendor-1', category_id: 'cat-4', cost: 85.00, selling_price: 149.99, quantity_on_hand: 16, core_required: false, core_charge: 0, min_qty: null, max_qty: null, bin_location: null, last_cost: null, avg_cost: null, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-11', part_number: 'FLT-001', description: 'Engine Oil 15W-40 (1 Gal)', vendor_id: 'vendor-2', category_id: 'cat-5', cost: 18.00, selling_price: 32.99, quantity_on_hand: 48, core_required: false, core_charge: 0, min_qty: null, max_qty: null, bin_location: null, last_cost: null, avg_cost: null, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-12', part_number: 'FLT-005', description: 'Coolant - HD Extended Life (1 Gal)', vendor_id: 'vendor-2', category_id: 'cat-5', cost: 22.00, selling_price: 39.99, quantity_on_hand: 36, core_required: false, core_charge: 0, min_qty: null, max_qty: null, bin_location: null, last_cost: null, avg_cost: null, is_active: true, created_at: staticDate, updated_at: staticDate },
];

// Sample Customers
const SAMPLE_CUSTOMERS: Customer[] = [
  { id: 'cust-1', company_name: 'ABC Trucking Inc', contact_name: 'John Smith', phone: '555-111-1111', email: 'john@abctrucking.com', address: '123 Industrial Blvd, Houston, TX 77001', notes: 'Fleet account - Net 30', price_level: 'FLEET', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'cust-2', company_name: 'Metro Logistics', contact_name: 'Sarah Johnson', phone: '555-222-2222', email: 'sarah@metrologistics.com', address: '456 Commerce St, Dallas, TX 75201', notes: 'Preferred customer', price_level: 'RETAIL', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'cust-3', company_name: 'Sunrise Freight', contact_name: 'Mike Davis', phone: '555-333-3333', email: 'mike@sunrisefreight.com', address: '789 Highway 45, Austin, TX 78701', notes: null, price_level: 'RETAIL', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'cust-4', company_name: 'Central Delivery Co', contact_name: 'Lisa Brown', phone: '555-444-4444', email: 'lisa@centraldelivery.com', address: '321 Main St, San Antonio, TX 78201', notes: 'COD only', price_level: 'WHOLESALE', is_active: true, created_at: staticDate, updated_at: staticDate },
];

// Sample Units
const SAMPLE_UNITS: Unit[] = [
  { id: 'unit-1', customer_id: 'cust-1', unit_name: 'Truck 101', vin: '1HGCM82633A123456', year: 2021, make: 'Freightliner', model: 'Cascadia', mileage: 245000, hours: null, notes: 'Primary long-haul unit', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'unit-2', customer_id: 'cust-1', unit_name: 'Truck 102', vin: '1HGCM82633A789012', year: 2020, make: 'Kenworth', model: 'T680', mileage: 312000, hours: null, notes: null, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'unit-3', customer_id: 'cust-1', unit_name: 'Truck 103', vin: '1HGCM82633A345678', year: 2022, make: 'Peterbilt', model: '579', mileage: 128000, hours: null, notes: 'Newer unit', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'unit-4', customer_id: 'cust-2', unit_name: 'Van A1', vin: '2FMZA52283BA98765', year: 2019, make: 'Ford', model: 'Transit 350', mileage: 89000, hours: null, notes: 'Delivery van', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'unit-5', customer_id: 'cust-2', unit_name: 'Box Truck B1', vin: '3ALACXDT7JDAB1234', year: 2020, make: 'International', model: 'MV607', mileage: 156000, hours: null, notes: null, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'unit-6', customer_id: 'cust-3', unit_name: 'Rig 01', vin: '1XP5DB9X7YN567890', year: 2018, make: 'Volvo', model: 'VNL 760', mileage: 425000, hours: null, notes: 'High mileage - monitor closely', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'unit-7', customer_id: 'cust-4', unit_name: 'Sprinter 1', vin: 'WDAPF4CC5E9876543', year: 2021, make: 'Mercedes', model: 'Sprinter 2500', mileage: 67000, hours: null, notes: null, is_active: true, created_at: staticDate, updated_at: staticDate },
];

const DEFAULT_TECH_SCHEDULE = {
  days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
  start_time: '07:00',
  end_time: '15:30',
};

const buildDefaultSchedule = () => ({
  days: { ...DEFAULT_TECH_SCHEDULE.days },
  start_time: DEFAULT_TECH_SCHEDULE.start_time,
  end_time: DEFAULT_TECH_SCHEDULE.end_time,
});

// Sample Technicians
const SAMPLE_TECHNICIANS: Technician[] = [
  { id: 'tech-1', name: 'Carlos Rodriguez', hourly_cost_rate: 35.00, default_billable_rate: 125.00, employment_type: 'HOURLY', skill_tags: ['Diagnostics', 'Electrical'], work_schedule: buildDefaultSchedule(), certifications: [], is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'tech-2', name: 'James Mitchell', hourly_cost_rate: 40.00, default_billable_rate: 125.00, employment_type: 'SALARY', skill_tags: ['Engine', 'Transmission'], work_schedule: buildDefaultSchedule(), certifications: [], is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'tech-3', name: 'Tony Williams', hourly_cost_rate: 32.00, default_billable_rate: 125.00, employment_type: 'CONTRACTOR', skill_tags: ['Hydraulics', 'Brakes'], work_schedule: buildDefaultSchedule(), certifications: [], is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'tech-4', name: 'David Chen', hourly_cost_rate: 45.00, default_billable_rate: 150.00, employment_type: 'HOURLY', skill_tags: ['Diagnostics', 'HVAC', 'PM/Service'], work_schedule: buildDefaultSchedule(), certifications: [], is_active: true, created_at: staticDate, updated_at: staticDate },
];

export const useShopStore = create<ShopState>()(
  persist(
    (set, get) => {
      const createPOsForNegativeInventory = (
        projectedQuantities?: Record<string, number>,
        sourceNote?: string
      ) => {
        const baseNote = 'Auto-generated from invoicing to replenish negative inventory';
        const noteText = sourceNote ? `${baseNote} (${sourceNote})` : baseNote;
        const state = get();
        const shortages = state.parts
          .map((part) => {
            const qoh = projectedQuantities?.[part.id] ?? part.quantity_on_hand;
            return { part, qoh };
          })
          .filter(
            ({ part, qoh }) =>
              qoh < 0 && !!part.vendor_id && part.max_qty !== null && part.max_qty > 0
          );

        if (shortages.length === 0) return;

        const grouped = shortages.reduce<Record<string, { part: Part; qoh: number }[]>>(
          (acc, item) => {
            const key = item.part.vendor_id;
            if (!key) return acc;
            acc[key] = acc[key] || [];
            acc[key].push(item);
            return acc;
          },
          {}
        );

        Object.entries(grouped).forEach(([vendorId, items]) => {
          const stateSnapshot = get();
          const existingPo = stateSnapshot.purchaseOrders.find(
            (po) => po.vendor_id === vendorId && po.status === 'OPEN'
          );
          let poId = existingPo?.id;
          if (!poId) {
            const newPo = get().createPurchaseOrder(vendorId);
            poId = newPo.id;
            set((state) => ({
              purchaseOrders: state.purchaseOrders.map((po) =>
                po.id === poId ? { ...po, notes: noteText } : po
              ),
            }));
          } else if (noteText) {
            const needsNote =
              !existingPo.notes || !existingPo.notes.includes(baseNote);
            if (needsNote) {
              set((state) => ({
                purchaseOrders: state.purchaseOrders.map((po) =>
                  po.id === poId
                    ? { ...po, notes: po.notes ? `${po.notes}\n${noteText}` : noteText }
                    : po
                ),
              }));
            }
          }

          items.forEach(({ part, qoh }) => {
            const orderQty = (part.max_qty ?? 0) - qoh;
            if (orderQty <= 0) return;
            get().poAddLine(poId, part.id, orderQty);
          });
        });
      };

      return {
      // Initial Settings
      settings: {
        id: '1',
        shop_name: 'Heavy-Duty Repair Shop',
        default_labor_rate: 125.00,
        default_tax_rate: 8.25,
        currency: 'USD',
        units: 'imperial',
        markup_retail_percent: 60,
        markup_fleet_percent: 40,
        markup_wholesale_percent: 25,
      },

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),

      // Customers
      customers: [WALKIN_CUSTOMER, ...SAMPLE_CUSTOMERS],

      addCustomer: (customer) => {
        const newCustomer: Customer = {
          ...customer,
          id: generateId(),
          price_level: customer.price_level ?? 'RETAIL',
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
      units: [...SAMPLE_UNITS],

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
      vendors: [...SAMPLE_VENDORS],

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
      categories: [...SAMPLE_CATEGORIES],

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
      parts: [...SAMPLE_PARTS],

      addPart: (part) => {
        const newPart: Part = {
          ...part,
          id: generateId(),
          min_qty: part.min_qty ?? null,
          max_qty: part.max_qty ?? null,
          bin_location: part.bin_location ?? null,
          last_cost: part.last_cost ?? null,
          avg_cost: part.avg_cost ?? null,
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

      updatePartWithQohAdjustment: (id, part, meta) => {
        const state = get();
        const existing = state.parts.find((p) => p.id === id);
        if (!existing) return;

        const old_qty = existing.quantity_on_hand;
        const new_qty = part.quantity_on_hand ?? old_qty;
        const adjustment: InventoryAdjustment = {
          id: generateId(),
          part_id: id,
          old_qty,
          new_qty,
          delta: new_qty - old_qty,
          reason: meta.reason,
          adjusted_by: meta.adjusted_by,
          adjusted_at: now(),
        };

        set((state) => ({
          parts: state.parts.map((p) =>
            p.id === id ? { ...p, ...part, updated_at: now() } : p
          ),
          inventoryAdjustments: [...state.inventoryAdjustments, adjustment],
        }));
      },

      deactivatePart: (id) =>
        set((state) => ({
          parts: state.parts.map((p) =>
            p.id === id ? { ...p, is_active: false, updated_at: now() } : p
          ),
        })),

      // Technicians
      technicians: [...SAMPLE_TECHNICIANS],

      addTechnician: (technician) => {
        const defaultSchedule = buildDefaultSchedule();
        const newTechnician: Technician = {
          ...technician,
          employment_type: technician.employment_type ?? 'HOURLY',
          skill_tags: technician.skill_tags ?? [],
          work_schedule: {
            ...defaultSchedule,
            ...(technician.work_schedule || {}),
            days: {
              ...defaultSchedule.days,
              ...(technician.work_schedule?.days || {}),
            },
          },
          certifications: technician.certifications ?? [],
          id: generateId(),
          is_active: technician.is_active ?? true,
          created_at: now(),
          updated_at: now(),
        };
        set((state) => ({
          technicians: [...state.technicians, newTechnician],
        }));
        return newTechnician;
      },

      updateTechnician: (id, technician) =>
        set((state) => ({
          technicians: state.technicians.map((t) =>
            t.id === id ? { ...t, ...technician, updated_at: now() } : t
          ),
        })),

      deactivateTechnician: (id) =>
        set((state) => ({
          technicians: state.technicians.map((t) =>
            t.id === id ? { ...t, is_active: false, updated_at: now() } : t
          ),
        })),

      // Time Entries
      timeEntries: [],

      clockIn: (technicianId, workOrderId) => {
        const state = get();
        
        // Check if work order exists and is not invoiced
        const workOrder = state.workOrders.find((wo) => wo.id === workOrderId);
        if (!workOrder) return { success: false, error: 'Work order not found' };
        if (workOrder.status === 'INVOICED') return { success: false, error: 'Cannot clock into invoiced order' };

        // Check if technician is active
        const technician = state.technicians.find((t) => t.id === technicianId);
        if (!technician || !technician.is_active) return { success: false, error: 'Technician not found or inactive' };

        // Auto clock-out from any current job
        const activeEntry = state.timeEntries.find((te) => te.technician_id === technicianId && !te.clock_out);
        if (activeEntry) {
          const clockOutTime = now();
          const clockInDate = new Date(activeEntry.clock_in);
          const clockOutDate = new Date(clockOutTime);
          const totalMinutes = Math.round((clockOutDate.getTime() - clockInDate.getTime()) / 60000);

          set((state) => ({
            timeEntries: state.timeEntries.map((te) =>
              te.id === activeEntry.id
                ? { ...te, clock_out: clockOutTime, total_minutes: totalMinutes, updated_at: now() }
                : te
            ),
          }));

          // Recalculate that work order
          get().recalculateWorkOrderTotals(activeEntry.work_order_id);
        }

        // Create new time entry
        const newEntry: TimeEntry = {
          id: generateId(),
          technician_id: technicianId,
          work_order_id: workOrderId,
          clock_in: now(),
          clock_out: null,
          total_minutes: 0,
          created_at: now(),
          updated_at: now(),
        };

        set((state) => ({
          timeEntries: [...state.timeEntries, newEntry],
        }));

        // Auto-update work order status to IN_PROGRESS
        if (workOrder.status === 'OPEN') {
          set((state) => ({
            workOrders: state.workOrders.map((wo) =>
              wo.id === workOrderId ? { ...wo, status: 'IN_PROGRESS', updated_at: now() } : wo
            ),
          }));
        }

        return { success: true };
      },

      clockOut: (technicianId) => {
        const state = get();
        const activeEntry = state.timeEntries.find((te) => te.technician_id === technicianId && !te.clock_out);
        
        if (!activeEntry) return { success: false, error: 'No active clock-in found' };

        const clockOutTime = now();
        const clockInDate = new Date(activeEntry.clock_in);
        const clockOutDate = new Date(clockOutTime);
        const totalMinutes = Math.round((clockOutDate.getTime() - clockInDate.getTime()) / 60000);

        set((state) => ({
          timeEntries: state.timeEntries.map((te) =>
            te.id === activeEntry.id
              ? { ...te, clock_out: clockOutTime, total_minutes: totalMinutes, updated_at: now() }
              : te
          ),
        }));

        get().recalculateWorkOrderTotals(activeEntry.work_order_id);
        return { success: true };
      },

      getActiveTimeEntry: (technicianId) =>
        get().timeEntries.find((te) => te.technician_id === technicianId && !te.clock_out),

      getTimeEntriesByWorkOrder: (workOrderId) =>
        get().timeEntries.filter((te) => te.work_order_id === workOrderId),

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
          status: 'ESTIMATE',
          notes: null,
          tax_rate: state.settings.default_tax_rate,
          subtotal: 0,
          core_charges_total: 0,
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

        const customer = state.customers.find((c) => c.id === order.customer_id);
        const level = customer?.price_level ?? 'RETAIL';
        const suggested = calcPartPriceForLevel(part, state.settings, level);
        const unitPrice = suggested ?? part.selling_price;

        const existingLine = state.salesOrderLines.find(
          (l) => l.sales_order_id === orderId && l.part_id === partId
        );

        if (existingLine) {
          const newQty = existingLine.quantity + qty;
          const lineTotal = newQty * existingLine.unit_price;
          
          set((state) => ({
            salesOrderLines: state.salesOrderLines.map((l) =>
              l.id === existingLine.id
                ? { ...l, quantity: newQty, line_total: lineTotal, updated_at: now() }
                : l
            ),
          }));
        } else {
          const newLine: SalesOrderLine = {
            id: generateId(),
            sales_order_id: orderId,
            part_id: partId,
            quantity: qty,
            unit_price: unitPrice,
            line_total: qty * unitPrice,
            is_warranty: false,
            core_charge: part.core_required ? part.core_charge : 0,
            core_returned: false,
            core_status: part.core_required && part.core_charge > 0 ? 'CORE_OWED' : 'NOT_APPLICABLE',
            core_returned_at: null,
            core_refunded_at: null,
            is_core_refund_line: false,
            core_refund_for_line_id: null,
            description: null,
            created_at: now(),
            updated_at: now(),
          };

          set((state) => ({
            salesOrderLines: [...state.salesOrderLines, newLine],
          }));
        }

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
        }));

        get().recalculateSalesOrderTotals(line.sales_order_id);
        return { success: true };
      },

      soUpdateLineUnitPrice: (lineId, newUnitPrice) => {
        const state = get();
        const line = state.salesOrderLines.find((l) => l.id === lineId);
        if (!line) return { success: false, error: 'Line not found' };

        const order = state.salesOrders.find((o) => o.id === line.sales_order_id);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Cannot modify invoiced order' };

        if (!Number.isFinite(newUnitPrice) || newUnitPrice < 0) {
          return { success: false, error: 'Invalid unit price' };
        }

        const updatedLineTotal = line.quantity * newUnitPrice;

        set((state) => ({
          salesOrderLines: state.salesOrderLines.map((l) =>
            l.id === lineId ? { ...l, unit_price: newUnitPrice, line_total: updatedLineTotal, updated_at: now() } : l
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
        }));

        get().recalculateSalesOrderTotals(line.sales_order_id);
        return { success: true };
      },

      soToggleWarranty: (lineId) => {
        const state = get();
        const line = state.salesOrderLines.find((l) => l.id === lineId);
        if (!line) return { success: false, error: 'Line not found' };

        const order = state.salesOrders.find((o) => o.id === line.sales_order_id);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Cannot modify invoiced order' };

        set((state) => ({
          salesOrderLines: state.salesOrderLines.map((l) =>
            l.id === lineId ? { ...l, is_warranty: !l.is_warranty, updated_at: now() } : l
          ),
        }));

        get().recalculateSalesOrderTotals(line.sales_order_id);
        return { success: true };
      },

      soToggleCoreReturned: (lineId) => {
        const state = get();
        const line = state.salesOrderLines.find((l) => l.id === lineId);
        if (!line) return { success: false, error: 'Line not found' };

        const order = state.salesOrders.find((o) => o.id === line.sales_order_id);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Cannot modify invoiced order' };

        set((state) => ({
          salesOrderLines: state.salesOrderLines.map((l) =>
            l.id === lineId ? { ...l, core_returned: !l.core_returned, updated_at: now() } : l
          ),
        }));

        get().recalculateSalesOrderTotals(line.sales_order_id);
        return { success: true };
      },

      soMarkCoreReturned: (lineId) => {
        const state = get();
        const line = state.salesOrderLines.find((l) => l.id === lineId);
        if (!line) return { success: false, error: 'Line not found' };
        if (line.core_status !== 'CORE_OWED') return { success: false, error: 'Core has already been processed' };
        if (line.is_core_refund_line) return { success: false, error: 'Cannot mark refund line as returned' };

        const order = state.salesOrders.find((o) => o.id === line.sales_order_id);
        if (!order) return { success: false, error: 'Order not found' };

        const part = state.parts.find((p) => p.id === line.part_id);
        const partDesc = part?.description || part?.part_number || 'Part';
        const timestamp = now();

        // Create refund line
        const refundLine: SalesOrderLine = {
          id: generateId(),
          sales_order_id: line.sales_order_id,
          part_id: line.part_id,
          quantity: line.quantity,
          unit_price: -line.core_charge,
          line_total: -(line.core_charge * line.quantity),
          is_warranty: false,
          core_charge: 0,
          core_returned: true,
          core_status: 'NOT_APPLICABLE',
          core_returned_at: null,
          core_refunded_at: null,
          is_core_refund_line: true,
          core_refund_for_line_id: lineId,
          description: `Core Refund (${partDesc})`,
          created_at: timestamp,
          updated_at: timestamp,
        };

        // Update original line status and add refund line
        set((state) => ({
          salesOrderLines: [
            ...state.salesOrderLines.map((l) =>
              l.id === lineId
                ? {
                    ...l,
                    core_returned: true,
                    core_status: 'CORE_CREDITED' as const,
                    core_returned_at: timestamp,
                    core_refunded_at: timestamp,
                    updated_at: timestamp,
                  }
                : l
            ),
            refundLine,
          ],
        }));

        get().recalculateSalesOrderTotals(line.sales_order_id);
        return { success: true };
      },

      soInvoice: (orderId) => {
        const state = get();
        const order = state.salesOrders.find((o) => o.id === orderId);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Order already invoiced' };
        if (order.status !== 'OPEN') return { success: false, error: 'Order must be open before invoicing' };

        const linesForOrder = state.salesOrderLines.filter(
          (l) => l.sales_order_id === orderId && !l.is_core_refund_line
        );
        const quantityByPart = linesForOrder.reduce<Record<string, number>>((acc, line) => {
          if (!line.part_id) return acc;
          acc[line.part_id] = (acc[line.part_id] || 0) + line.quantity;
          return acc;
        }, {});
        const projectedQuantities = state.parts.reduce<Record<string, number>>((acc, part) => {
          const qty = quantityByPart[part.id] || 0;
          acc[part.id] = part.quantity_on_hand - qty;
          return acc;
        }, {});
        const timestamp = now();

        set((state) => ({
          salesOrders: state.salesOrders.map((o) =>
            o.id === orderId
              ? { ...o, status: 'INVOICED', invoiced_at: timestamp, updated_at: timestamp }
              : o
          ),
          parts: state.parts.map((p) => {
            const qty = quantityByPart[p.id];
            if (!qty) return p;
            return { ...p, quantity_on_hand: p.quantity_on_hand - qty, updated_at: timestamp };
          }),
        }));
        createPOsForNegativeInventory(
          projectedQuantities,
          order.order_number ? `SO ${order.order_number}` : `SO ${order.id}`
        );
        return { success: true };
      },

      soConvertToOpen: (orderId) => {
        const state = get();
        const order = state.salesOrders.find((o) => o.id === orderId);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Cannot convert invoiced order' };
        if (order.status === 'OPEN') return { success: true };

        set((state) => ({
          salesOrders: state.salesOrders.map((o) =>
            o.id === orderId ? { ...o, status: 'OPEN', invoiced_at: null, updated_at: now() } : o
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
        
        // Calculate subtotal (warranty items are $0 to customer, include refund lines)
        const subtotal = lines.reduce((sum, l) => {
          if (l.is_warranty) return sum;
          // Refund lines have negative line_total and should be included
          return sum + l.line_total;
        }, 0);
        
        // Calculate core charges (only for non-returned cores, exclude refund lines which are already in subtotal)
        const core_charges_total = lines.reduce((sum, l) => {
          if (l.is_core_refund_line) return sum; // Refund lines already included in subtotal
          if (l.core_charge > 0 && !l.core_returned) {
            return sum + (l.core_charge * l.quantity);
          }
          return sum;
        }, 0);
        
        const order = state.salesOrders.find((o) => o.id === orderId);
        if (!order) return;
        
        const taxableAmount = subtotal + core_charges_total;
        const tax_amount = taxableAmount * (order.tax_rate / 100);
        const total = taxableAmount + tax_amount;

        set((state) => ({
          salesOrders: state.salesOrders.map((o) =>
            o.id === orderId
              ? { ...o, subtotal, core_charges_total, tax_amount, total, updated_at: now() }
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
          core_charges_total: 0,
          subtotal: 0,
          tax_amount: 0,
          total: 0,
          labor_cost: 0,
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
        const customer = state.customers.find((c) => c.id === order.customer_id);
        const level = customer?.price_level ?? 'RETAIL';
        const suggested = calcPartPriceForLevel(part, state.settings, level);
        const unitPrice = suggested ?? part.selling_price;

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
            unit_price: unitPrice,
            line_total: qty * unitPrice,
            is_warranty: false,
            core_charge: part.core_required ? part.core_charge : 0,
            core_returned: false,
            core_status: part.core_required && part.core_charge > 0 ? 'CORE_OWED' : 'NOT_APPLICABLE',
            core_returned_at: null,
            core_refunded_at: null,
            is_core_refund_line: false,
            core_refund_for_line_id: null,
            description: null,
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

      woTogglePartWarranty: (lineId) => {
        const state = get();
        const line = state.workOrderPartLines.find((l) => l.id === lineId);
        if (!line) return { success: false, error: 'Line not found' };

        const order = state.workOrders.find((o) => o.id === line.work_order_id);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Cannot modify invoiced order' };

        set((state) => ({
          workOrderPartLines: state.workOrderPartLines.map((l) =>
            l.id === lineId ? { ...l, is_warranty: !l.is_warranty, updated_at: now() } : l
          ),
        }));

        get().recalculateWorkOrderTotals(line.work_order_id);
        return { success: true };
      },

      woToggleCoreReturned: (lineId) => {
        const state = get();
        const line = state.workOrderPartLines.find((l) => l.id === lineId);
        if (!line) return { success: false, error: 'Line not found' };

        const order = state.workOrders.find((o) => o.id === line.work_order_id);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Cannot modify invoiced order' };

        set((state) => ({
          workOrderPartLines: state.workOrderPartLines.map((l) =>
            l.id === lineId ? { ...l, core_returned: !l.core_returned, updated_at: now() } : l
          ),
        }));

        get().recalculateWorkOrderTotals(line.work_order_id);
        return { success: true };
      },

      woMarkCoreReturned: (lineId) => {
        const state = get();
        const line = state.workOrderPartLines.find((l) => l.id === lineId);
        if (!line) return { success: false, error: 'Line not found' };
        if (line.core_status !== 'CORE_OWED') return { success: false, error: 'Core has already been processed' };
        if (line.is_core_refund_line) return { success: false, error: 'Cannot mark refund line as returned' };

        const order = state.workOrders.find((o) => o.id === line.work_order_id);
        if (!order) return { success: false, error: 'Order not found' };

        const part = state.parts.find((p) => p.id === line.part_id);
        const partDesc = part?.description || part?.part_number || 'Part';
        const timestamp = now();

        // Create refund line
        const refundLine: WorkOrderPartLine = {
          id: generateId(),
          work_order_id: line.work_order_id,
          part_id: line.part_id,
          quantity: line.quantity,
          unit_price: -line.core_charge,
          line_total: -(line.core_charge * line.quantity),
          is_warranty: false,
          core_charge: 0,
          core_returned: true,
          core_status: 'NOT_APPLICABLE',
          core_returned_at: null,
          core_refunded_at: null,
          is_core_refund_line: true,
          core_refund_for_line_id: lineId,
          description: `Core Refund (${partDesc})`,
          created_at: timestamp,
          updated_at: timestamp,
        };

        // Update original line status and add refund line
        set((state) => ({
          workOrderPartLines: [
            ...state.workOrderPartLines.map((l) =>
              l.id === lineId
                ? {
                    ...l,
                    core_returned: true,
                    core_status: 'CORE_CREDITED' as const,
                    core_returned_at: timestamp,
                    core_refunded_at: timestamp,
                    updated_at: timestamp,
                  }
                : l
            ),
            refundLine,
          ],
        }));

        get().recalculateWorkOrderTotals(line.work_order_id);
        return { success: true };
      },

      woAddLaborLine: (orderId, description, hours, technicianId) => {
        const state = get();
        const order = state.workOrders.find((o) => o.id === orderId);
        
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Cannot modify invoiced order' };

        const rate = state.settings.default_labor_rate;
        const newLine: WorkOrderLaborLine = {
          id: generateId(),
          work_order_id: orderId,
          description,
          hours,
          rate,
          line_total: hours * rate,
          is_warranty: false,
          technician_id: technicianId || null,
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

      woToggleLaborWarranty: (lineId) => {
        const state = get();
        const line = state.workOrderLaborLines.find((l) => l.id === lineId);
        if (!line) return { success: false, error: 'Line not found' };

        const order = state.workOrders.find((o) => o.id === line.work_order_id);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'INVOICED') return { success: false, error: 'Cannot modify invoiced order' };

        set((state) => ({
          workOrderLaborLines: state.workOrderLaborLines.map((l) =>
            l.id === lineId ? { ...l, is_warranty: !l.is_warranty, updated_at: now() } : l
          ),
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

        // Clock out all active technicians on this order
        const activeEntries = state.timeEntries.filter(
          (te) => te.work_order_id === orderId && !te.clock_out
        );
        
        for (const entry of activeEntries) {
          get().clockOut(entry.technician_id);
        }

        set((state) => ({
          workOrders: state.workOrders.map((o) =>
            o.id === orderId
              ? { ...o, status: 'INVOICED', invoiced_at: now(), updated_at: now() }
              : o
          ),
        }));
        createPOsForNegativeInventory(
          undefined,
          order.order_number ? `WO ${order.order_number}` : `WO ${order.id}`
        );
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
        const timeEntries = state.timeEntries.filter((te) => te.work_order_id === orderId);
        
        // Parts: warranty items are $0 to customer, include refund lines (they have negative line_total)
        const parts_subtotal = partLines.reduce((sum, l) => {
          if (l.is_warranty) return sum;
          return sum + l.line_total;
        }, 0);
        
        // Core charges (only for non-returned cores, exclude refund lines)
        const core_charges_total = partLines.reduce((sum, l) => {
          if (l.is_core_refund_line) return sum;
          if (l.core_charge > 0 && !l.core_returned) {
            return sum + (l.core_charge * l.quantity);
          }
          return sum;
        }, 0);
        
        // Labor: warranty items are $0 to customer
        const labor_subtotal = laborLines.reduce((sum, l) => sum + (l.is_warranty ? 0 : l.line_total), 0);
        
        // Calculate labor cost (internal) from time entries
        let labor_cost = 0;
        for (const entry of timeEntries) {
          const technician = state.technicians.find((t) => t.id === entry.technician_id);
          if (technician) {
            const hours = entry.total_minutes / 60;
            labor_cost += hours * technician.hourly_cost_rate;
          }
        }
        
        const subtotal = parts_subtotal + labor_subtotal + core_charges_total;
        
        const order = state.workOrders.find((o) => o.id === orderId);
        if (!order) return;
        
        const tax_amount = subtotal * (order.tax_rate / 100);
        const total = subtotal + tax_amount;

        set((state) => ({
          workOrders: state.workOrders.map((o) =>
            o.id === orderId
              ? { ...o, parts_subtotal, labor_subtotal, core_charges_total, subtotal, tax_amount, total, labor_cost, updated_at: now() }
              : o
          ),
        }));
      },

      // Purchase Orders
      purchaseOrders: [],
      purchaseOrderLines: [],
      receivingRecords: [],
      inventoryAdjustments: [],
      vendorCostHistory: [],

      createPurchaseOrder: (vendorId) => {
        const state = get();
        const newOrder: PurchaseOrder = {
          id: generateId(),
          po_number: generateOrderNumber('PO', state.purchaseOrders.length),
          vendor_id: vendorId,
          status: 'OPEN',
          notes: null,
          created_at: now(),
          updated_at: now(),
        };
        set((state) => ({
          purchaseOrders: [...state.purchaseOrders, newOrder],
        }));
        return newOrder;
      },

      poAddLine: (orderId, partId, quantity) => {
        const state = get();
        const order = state.purchaseOrders.find((o) => o.id === orderId);
        
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'CLOSED') return { success: false, error: 'Cannot modify closed PO' };
        
        const part = state.parts.find((p) => p.id === partId);
        if (!part) return { success: false, error: 'Part not found' };

        // Check for existing line
        const existingLine = state.purchaseOrderLines.find(
          (l) => l.purchase_order_id === orderId && l.part_id === partId
        );

        if (existingLine) {
          const newQty = existingLine.ordered_quantity + quantity;
          set((state) => ({
            purchaseOrderLines: state.purchaseOrderLines.map((l) =>
              l.id === existingLine.id
                ? { ...l, ordered_quantity: newQty, updated_at: now() }
                : l
            ),
          }));
        } else {
          const newLine: PurchaseOrderLine = {
            id: generateId(),
            purchase_order_id: orderId,
            part_id: partId,
            ordered_quantity: quantity,
            received_quantity: 0,
            unit_cost: part.cost, // Snapshot cost
            created_at: now(),
            updated_at: now(),
          };

          set((state) => ({
            purchaseOrderLines: [...state.purchaseOrderLines, newLine],
          }));
        }

        return { success: true };
      },

      poUpdateLineQty: (lineId, newQty) => {
        const state = get();
        const line = state.purchaseOrderLines.find((l) => l.id === lineId);
        if (!line) return { success: false, error: 'Line not found' };

        const order = state.purchaseOrders.find((o) => o.id === line.purchase_order_id);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'CLOSED') return { success: false, error: 'Cannot modify closed PO' };

        if (newQty < line.received_quantity) {
          return { success: false, error: 'Cannot reduce quantity below received amount' };
        }

        set((state) => ({
          purchaseOrderLines: state.purchaseOrderLines.map((l) =>
            l.id === lineId ? { ...l, ordered_quantity: newQty, updated_at: now() } : l
          ),
        }));

        return { success: true };
      },

      poRemoveLine: (lineId) => {
        const state = get();
        const line = state.purchaseOrderLines.find((l) => l.id === lineId);
        if (!line) return { success: false, error: 'Line not found' };

        const order = state.purchaseOrders.find((o) => o.id === line.purchase_order_id);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'CLOSED') return { success: false, error: 'Cannot modify closed PO' };

        if (line.received_quantity > 0) {
          return { success: false, error: 'Cannot remove line with received items' };
        }

        set((state) => ({
          purchaseOrderLines: state.purchaseOrderLines.filter((l) => l.id !== lineId),
        }));

        return { success: true };
      },

      poReceive: (lineId, quantity) => {
        const state = get();
        const line = state.purchaseOrderLines.find((l) => l.id === lineId);
        if (!line) return { success: false, error: 'Line not found' };

        const order = state.purchaseOrders.find((o) => o.id === line.purchase_order_id);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'CLOSED') return { success: false, error: 'Cannot receive on closed PO' };

        const remaining = line.ordered_quantity - line.received_quantity;
        if (quantity > remaining) {
          return { success: false, error: `Cannot receive more than remaining quantity (${remaining})` };
        }

        const newReceivedQty = line.received_quantity + quantity;
        const part = state.parts.find((p) => p.id === line.part_id);
        if (!part) return { success: false, error: 'Part not found' };

        // Create receiving record
        const receivingRecord: ReceivingRecord = {
          id: generateId(),
          purchase_order_line_id: lineId,
          quantity_received: quantity,
          received_at: now(),
          notes: null,
        };
        const costHistory: VendorCostHistory = {
          id: generateId(),
          part_id: line.part_id,
          vendor_id: order.vendor_id,
          unit_cost: line.unit_cost,
          quantity,
          source: 'RECEIVING',
          created_at: now(),
        };
        const oldQoh = part.quantity_on_hand;
        const receivedCost = line.unit_cost;
        const receivedQty = quantity;
        let avgCost = part.avg_cost;
        if (avgCost === null || oldQoh <= 0) {
          avgCost = receivedCost;
        } else {
          avgCost = ((avgCost * oldQoh) + (receivedCost * receivedQty)) / (oldQoh + receivedQty);
        }
        const timestamp = now();

        set((state) => ({
          purchaseOrderLines: state.purchaseOrderLines.map((l) =>
            l.id === lineId
              ? { ...l, received_quantity: newReceivedQty, updated_at: timestamp }
              : l
          ),
          // Update part inventory and cost
          parts: state.parts.map((p) =>
            p.id === line.part_id
              ? { 
                  ...p, 
                  quantity_on_hand: p.quantity_on_hand + quantity,
                  cost: line.unit_cost, // Update to last received cost
                  last_cost: receivedCost,
                  avg_cost: avgCost,
                  updated_at: timestamp, 
                }
              : p
          ),
          receivingRecords: [...state.receivingRecords, receivingRecord],
          vendorCostHistory: [...state.vendorCostHistory, costHistory],
        }));

        return { success: true };
      },

      poClose: (orderId) => {
        const state = get();
        const order = state.purchaseOrders.find((o) => o.id === orderId);
        if (!order) return { success: false, error: 'Order not found' };
        if (order.status === 'CLOSED') return { success: false, error: 'Order already closed' };

        // Check all lines are fully received
        const lines = state.purchaseOrderLines.filter((l) => l.purchase_order_id === orderId);
        const hasOutstanding = lines.some((l) => l.received_quantity < l.ordered_quantity);
        
        if (hasOutstanding) {
          return { success: false, error: 'Cannot close PO with outstanding quantities' };
        }

        set((state) => ({
          purchaseOrders: state.purchaseOrders.map((o) =>
            o.id === orderId ? { ...o, status: 'CLOSED', updated_at: now() } : o
          ),
        }));

        return { success: true };
      },

      updatePurchaseOrderNotes: (orderId, notes) =>
        set((state) => ({
          purchaseOrders: state.purchaseOrders.map((o) =>
            o.id === orderId ? { ...o, notes, updated_at: now() } : o
          ),
        })),

      getPurchaseOrderLines: (orderId) =>
        get().purchaseOrderLines.filter((l) => l.purchase_order_id === orderId),

      getReceivingRecords: (lineId) =>
        get().receivingRecords.filter((r) => r.purchase_order_line_id === lineId),

      // PM Schedules
      pmSchedules: [],
      pmHistory: [],

      addPMSchedule: (schedule) => {
        const newSchedule: UnitPMSchedule = {
          ...schedule,
          id: generateId(),
          last_generated_due_key: schedule.last_generated_due_key ?? null,
          last_generated_work_order_id: schedule.last_generated_work_order_id ?? null,
          is_active: true,
          created_at: now(),
          updated_at: now(),
        };
        set((state) => ({
          pmSchedules: [...state.pmSchedules, newSchedule],
        }));
        return newSchedule;
      },

      updatePMSchedule: (id, schedule) =>
        set((state) => ({
          pmSchedules: state.pmSchedules.map((s) =>
            s.id === id ? { ...s, ...schedule, updated_at: now() } : s
          ),
        })),

      deactivatePMSchedule: (id) =>
        set((state) => ({
          pmSchedules: state.pmSchedules.map((s) =>
            s.id === id ? { ...s, is_active: false, updated_at: now() } : s
          ),
        })),

      getPMSchedulesByUnit: (unitId) =>
        get().pmSchedules.filter((s) => s.unit_id === unitId && s.is_active),

      addPMHistory: (history) => {
        const newHistory: UnitPMHistory = {
          ...history,
          id: generateId(),
          is_active: true,
          created_at: now(),
        };
        set((state) => ({
          pmHistory: [...state.pmHistory, newHistory],
        }));
        return newHistory;
      },

      getPMHistoryByUnit: (unitId) =>
        get().pmHistory.filter((h) => h.unit_id === unitId && h.is_active),

      markPMCompleted: (scheduleId, completedDate, completedMeter, notes) => {
        const state = get();
        const schedule = state.pmSchedules.find((s) => s.id === scheduleId);
        if (!schedule) return { success: false, error: 'Schedule not found' };

        // Add history record
        const historyRecord: UnitPMHistory = {
          id: generateId(),
          unit_id: schedule.unit_id,
          schedule_id: scheduleId,
          completed_date: completedDate,
          completed_meter: completedMeter,
          notes: notes,
          related_work_order_id: schedule.last_generated_work_order_id ?? null,
          is_active: true,
          created_at: now(),
        };

        // Update schedule with last completed info
        set((state) => ({
          pmSchedules: state.pmSchedules.map((s) =>
            s.id === scheduleId
              ? {
                  ...s,
                  last_completed_date: completedDate,
                  last_completed_meter: completedMeter,
                  last_generated_due_key: null,
                  last_generated_work_order_id: null,
                  updated_at: now(),
                }
              : s
          ),
          pmHistory: [...state.pmHistory, historyRecord],
        }));

        return { success: true };
      },
      };
    },
    {
      name: 'shop-storage',
    }
  )
);
