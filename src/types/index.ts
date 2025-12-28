// System Settings
export interface SystemSettings {
  id: string;
  shop_name: string;
  default_labor_rate: number;
  default_tax_rate: number;
  currency: string;
  units: string;
}

// Customer
export interface Customer {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Unit / Equipment
export interface Unit {
  id: string;
  customer_id: string;
  unit_name: string;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  mileage: number | null;
  hours: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

// Vendor
export interface Vendor {
  id: string;
  vendor_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Part Category
export interface PartCategory {
  id: string;
  category_name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Part / Inventory
export interface Part {
  id: string;
  part_number: string;
  description: string | null;
  vendor_id: string;
  category_id: string;
  cost: number;
  selling_price: number;
  quantity_on_hand: number;
  core_required: boolean;
  core_charge: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  vendor?: Vendor;
  category?: PartCategory;
}

export interface TechnicianWorkSchedule {
  days: {
    mon: boolean;
    tue: boolean;
    wed: boolean;
    thu: boolean;
    fri: boolean;
    sat: boolean;
    sun: boolean;
  };
  start_time: string;
  end_time: string;
}

export interface TechnicianCertification {
  id: string;
  name: string;
  expires_on: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Technician
export interface Technician {
  id: string;
  name: string;
  hourly_cost_rate: number;
  default_billable_rate: number | null;
  employment_type: 'HOURLY' | 'SALARY' | 'CONTRACTOR';
  skill_tags: string[];
  work_schedule: TechnicianWorkSchedule;
  certifications: TechnicianCertification[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Time Entry (Technician Clock In/Out)
export interface TimeEntry {
  id: string;
  technician_id: string;
  work_order_id: string;
  clock_in: string;
  clock_out: string | null;
  total_minutes: number;
  created_at: string;
  updated_at: string;
  technician?: Technician;
}

// Core Status
export type CoreStatus = 'CORE_OWED' | 'CORE_RETURNED' | 'CORE_CREDITED' | 'NOT_APPLICABLE';

// Sales Order Status
export type SalesOrderStatus = 'OPEN' | 'INVOICED';

// Sales Order
export interface SalesOrder {
  id: string;
  order_number: string;
  customer_id: string;
  unit_id: string | null;
  status: SalesOrderStatus;
  notes: string | null;
  tax_rate: number;
  subtotal: number;
  core_charges_total: number;
  tax_amount: number;
  total: number;
  invoiced_at: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  unit?: Unit;
  lines?: SalesOrderLine[];
}

// Sales Order Line
export interface SalesOrderLine {
  id: string;
  sales_order_id: string;
  part_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  is_warranty: boolean;
  core_charge: number;
  core_returned: boolean;
  core_status: CoreStatus;
  core_returned_at: string | null;
  core_refunded_at: string | null;
  is_core_refund_line: boolean;
  core_refund_for_line_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  part?: Part;
}

// Work Order Status
export type WorkOrderStatus = 'OPEN' | 'IN_PROGRESS' | 'INVOICED';

// Work Order
export interface WorkOrder {
  id: string;
  order_number: string;
  customer_id: string;
  unit_id: string;
  status: WorkOrderStatus;
  notes: string | null;
  tax_rate: number;
  parts_subtotal: number;
  labor_subtotal: number;
  core_charges_total: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  labor_cost: number; // Internal cost tracking
  invoiced_at: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  unit?: Unit;
  part_lines?: WorkOrderPartLine[];
  labor_lines?: WorkOrderLaborLine[];
}

// Work Order Part Line
export interface WorkOrderPartLine {
  id: string;
  work_order_id: string;
  part_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  is_warranty: boolean;
  core_charge: number;
  core_returned: boolean;
  core_status: CoreStatus;
  core_returned_at: string | null;
  core_refunded_at: string | null;
  is_core_refund_line: boolean;
  core_refund_for_line_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  part?: Part;
}

// Work Order Labor Line
export interface WorkOrderLaborLine {
  id: string;
  work_order_id: string;
  description: string;
  hours: number;
  rate: number;
  line_total: number;
  is_warranty: boolean;
  technician_id: string | null;
  created_at: string;
  updated_at: string;
}

// Purchase Order Status
export type PurchaseOrderStatus = 'OPEN' | 'CLOSED';

// Purchase Order
export interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_id: string;
  status: PurchaseOrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vendor?: Vendor;
  lines?: PurchaseOrderLine[];
}

// Purchase Order Line
export interface PurchaseOrderLine {
  id: string;
  purchase_order_id: string;
  part_id: string;
  ordered_quantity: number;
  received_quantity: number;
  unit_cost: number; // Snapshotted at creation
  created_at: string;
  updated_at: string;
  part?: Part;
}

// Receiving Record
export interface ReceivingRecord {
  id: string;
  purchase_order_line_id: string;
  quantity_received: number;
  received_at: string;
  notes: string | null;
}

// Dashboard Stats
export interface DashboardStats {
  openWorkOrders: number;
  openSalesOrders: number;
  openPurchaseOrders: number;
  dailyRevenue: number;
  negativeInventoryItems: Part[];
  warrantyTotals: {
    partsCost: number;
    laborCost: number;
  };
}

// PM Interval Types
export type PMIntervalType = 'MILES' | 'HOURS' | 'DAYS';

// PM Schedule Status
export type PMScheduleStatus = 'OVERDUE' | 'DUE_SOON' | 'OK' | 'NOT_CONFIGURED';

// Unit PM Schedule
export interface UnitPMSchedule {
  id: string;
  unit_id: string;
  name: string;
  interval_type: PMIntervalType;
  interval_value: number;
  last_completed_date: string | null;
  last_completed_meter: number | null;
  default_labor_description: string | null;
  default_labor_hours: number | null;
  last_generated_due_key: string | null;
  last_generated_work_order_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Unit PM History
export interface UnitPMHistory {
  id: string;
  unit_id: string;
  schedule_id: string;
  completed_date: string;
  completed_meter: number | null;
  notes: string | null;
  related_work_order_id: string | null;
  is_active: boolean;
  created_at: string;
}
