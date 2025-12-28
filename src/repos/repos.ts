import type {
  SystemSettings,
  Customer,
  Unit,
  Vendor,
  PartCategory,
  Part,
  Technician,
  TimeEntry,
  SalesOrder,
  SalesOrderLine,
  WorkOrder,
  WorkOrderPartLine,
  WorkOrderLaborLine,
  PurchaseOrder,
  PurchaseOrderLine,
  ReceivingRecord,
} from '@/types';

export interface SettingsRepo {
  settings: SystemSettings;
  updateSettings: (settings: Partial<SystemSettings>) => void;
}

export interface CustomersRepo {
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'is_active' | 'created_at' | 'updated_at'>) => Customer;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deactivateCustomer: (id: string) => boolean;
}

export interface UnitsRepo {
  units: Unit[];
  addUnit: (unit: Omit<Unit, 'id' | 'is_active' | 'created_at' | 'updated_at'>) => Unit;
  updateUnit: (id: string, unit: Partial<Unit>) => void;
  deactivateUnit: (id: string) => void;
  getUnitsByCustomer: (customerId: string) => Unit[];
}

export interface VendorsRepo {
  vendors: Vendor[];
  addVendor: (vendor: Omit<Vendor, 'id' | 'is_active' | 'created_at' | 'updated_at'>) => Vendor;
  updateVendor: (id: string, vendor: Partial<Vendor>) => void;
  deactivateVendor: (id: string) => void;
}

export interface CategoriesRepo {
  categories: PartCategory[];
  addCategory: (category: Omit<PartCategory, 'id' | 'is_active' | 'created_at' | 'updated_at'>) => PartCategory;
  updateCategory: (id: string, category: Partial<PartCategory>) => void;
  deactivateCategory: (id: string) => void;
}

export interface PartsRepo {
  parts: Part[];
  addPart: (part: Omit<Part, 'id' | 'is_active' | 'created_at' | 'updated_at'>) => Part;
  updatePart: (id: string, part: Partial<Part>) => void;
  deactivatePart: (id: string) => void;
}

export interface TechniciansRepo {
  technicians: Technician[];
  addTechnician: (technician: Omit<Technician, 'id' | 'is_active' | 'created_at' | 'updated_at'>) => Technician;
  updateTechnician: (id: string, technician: Partial<Technician>) => void;
  deactivateTechnician: (id: string) => void;
}

export interface TimeEntriesRepo {
  timeEntries: TimeEntry[];
  clockIn: (technicianId: string, workOrderId: string) => { success: boolean; error?: string };
  clockOut: (technicianId: string) => { success: boolean; error?: string };
  getActiveTimeEntry: (technicianId: string) => TimeEntry | undefined;
  getTimeEntriesByWorkOrder: (workOrderId: string) => TimeEntry[];
}

export interface SalesOrdersRepo {
  salesOrders: SalesOrder[];
  salesOrderLines: SalesOrderLine[];
  createSalesOrder: (customerId: string, unitId: string | null) => SalesOrder;
  soAddPartLine: (orderId: string, partId: string, qty: number) => { success: boolean; error?: string };
  soUpdatePartQty: (lineId: string, newQty: number) => { success: boolean; error?: string };
  soRemovePartLine: (lineId: string) => { success: boolean; error?: string };
  soToggleWarranty: (lineId: string) => { success: boolean; error?: string };
  soToggleCoreReturned: (lineId: string) => { success: boolean; error?: string };
  soConvertToOpen: (orderId: string) => { success: boolean; error?: string };
  soInvoice: (orderId: string) => { success: boolean; error?: string };
  updateSalesOrderNotes: (orderId: string, notes: string | null) => void;
  getSalesOrderLines: (orderId: string) => SalesOrderLine[];
  recalculateSalesOrderTotals: (orderId: string) => void;
}

export interface WorkOrdersRepo {
  workOrders: WorkOrder[];
  workOrderPartLines: WorkOrderPartLine[];
  workOrderLaborLines: WorkOrderLaborLine[];
  createWorkOrder: (customerId: string, unitId: string) => WorkOrder;
  woAddPartLine: (orderId: string, partId: string, qty: number) => { success: boolean; error?: string };
  woUpdatePartQty: (lineId: string, newQty: number) => { success: boolean; error?: string };
  woRemovePartLine: (lineId: string) => { success: boolean; error?: string };
  woTogglePartWarranty: (lineId: string) => { success: boolean; error?: string };
  woToggleCoreReturned: (lineId: string) => { success: boolean; error?: string };
  woAddLaborLine: (orderId: string, description: string, hours: number, technicianId?: string) => { success: boolean; error?: string };
  woUpdateLaborLine: (lineId: string, description: string, hours: number) => { success: boolean; error?: string };
  woRemoveLaborLine: (lineId: string) => { success: boolean; error?: string };
  woToggleLaborWarranty: (lineId: string) => { success: boolean; error?: string };
  woUpdateStatus: (orderId: string, status: 'IN_PROGRESS') => { success: boolean; error?: string };
  woInvoice: (orderId: string) => { success: boolean; error?: string };
  getWorkOrderPartLines: (orderId: string) => WorkOrderPartLine[];
  getWorkOrderLaborLines: (orderId: string) => WorkOrderLaborLine[];
  updateWorkOrderNotes: (orderId: string, notes: string | null) => void;
  recalculateWorkOrderTotals: (orderId: string) => void;
}

export interface PurchaseOrdersRepo {
  purchaseOrders: PurchaseOrder[];
  purchaseOrderLines: PurchaseOrderLine[];
  receivingRecords: ReceivingRecord[];
  createPurchaseOrder: (vendorId: string) => PurchaseOrder;
  poAddLine: (orderId: string, partId: string, quantity: number) => { success: boolean; error?: string };
  poUpdateLineQty: (lineId: string, newQty: number) => { success: boolean; error?: string };
  poRemoveLine: (lineId: string) => { success: boolean; error?: string };
  poReceive: (lineId: string, quantity: number) => { success: boolean; error?: string };
  poClose: (orderId: string) => { success: boolean; error?: string };
  updatePurchaseOrderNotes: (orderId: string, notes: string | null) => void;
  getPurchaseOrderLines: (orderId: string) => PurchaseOrderLine[];
  getReceivingRecords: (lineId: string) => ReceivingRecord[];
}

export interface Repos {
  settings: SettingsRepo;
  customers: CustomersRepo;
  units: UnitsRepo;
  vendors: VendorsRepo;
  categories: CategoriesRepo;
  parts: PartsRepo;
  technicians: TechniciansRepo;
  timeEntries: TimeEntriesRepo;
  salesOrders: SalesOrdersRepo;
  workOrders: WorkOrdersRepo;
  purchaseOrders: PurchaseOrdersRepo;
}
