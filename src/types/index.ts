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
  is_active: boolean;
  created_at: string;
  updated_at: string;
  vendor?: Vendor;
  category?: PartCategory;
}

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
  subtotal: number;
  tax_amount: number;
  total: number;
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
  created_at: string;
  updated_at: string;
}

// Dashboard Stats
export interface DashboardStats {
  openWorkOrders: number;
  openSalesOrders: number;
  dailyRevenue: number;
  negativeInventoryItems: Part[];
}
