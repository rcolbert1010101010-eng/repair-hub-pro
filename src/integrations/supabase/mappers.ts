import type { Vendor, PartCategory, Part, SalesOrder, SalesOrderLine, SalesOrderStatus, Customer, Unit } from "@/types";

/**
 * Supabase row shapes (minimal) -> UI types
 * We keep UI types unchanged to avoid breaking the app during migration.
 */

export type DbVendor = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DbCategory = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DbCustomer = {
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
};

export type DbUnit = {
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
};

export type DbPart = {
  id: string;
  part_number: string;
  description: string | null;
  vendor_id: string;
  category_id: string;
  cost: number;
  sell_price: number;
  quantity_on_hand: number;
  core_required: boolean;
  core_charge_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DbSalesOrder = {
  id: string;
  order_number: string;
  customer_id: string;
  unit_id: string | null;
  status: string;
  notes: string | null;
  tax_rate: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  invoiced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DbSalesOrderLine = {
  id: string;
  sales_order_id: string;
  part_id: string;
  qty: number;
  unit_price: number;
  line_total: number;
  is_warranty: boolean;
  core_charge: number;
  core_returned: boolean;
  created_at: string;
  updated_at: string;
};

export function mapVendor(row: DbVendor): Vendor {
  return {
    id: row.id,
    vendor_name: row.name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapCategory(row: DbCategory): PartCategory {
  return {
    id: row.id,
    category_name: row.name,
    description: row.description,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapCustomer(row: DbCustomer): Customer {
  return {
    id: row.id,
    company_name: row.company_name,
    contact_name: row.contact_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapUnit(row: DbUnit): Unit {
  return {
    id: row.id,
    customer_id: row.customer_id,
    unit_name: row.unit_name,
    vin: row.vin,
    year: row.year,
    make: row.make,
    model: row.model,
    mileage: row.mileage,
    hours: row.hours,
    notes: row.notes,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapPart(row: DbPart): Part {
  return {
    id: row.id,
    part_number: row.part_number,
    description: row.description,
    vendor_id: row.vendor_id,
    category_id: row.category_id,
    cost: row.cost,
    selling_price: row.sell_price,
    quantity_on_hand: row.quantity_on_hand,
    core_required: row.core_required,
    core_charge: row.core_charge_amount,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapSalesOrder(row: DbSalesOrder): SalesOrder {
  return {
    id: row.id,
    order_number: row.order_number,
    customer_id: row.customer_id,
    unit_id: row.unit_id,
    status: row.status as SalesOrderStatus,
    notes: row.notes,
    tax_rate: row.tax_rate,
    subtotal: row.subtotal,
    core_charges_total: 0,
    tax_amount: row.tax_amount,
    total: row.total,
    invoiced_at: row.invoiced_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapSalesOrderLine(row: DbSalesOrderLine): SalesOrderLine {
  return {
    id: row.id,
    sales_order_id: row.sales_order_id,
    part_id: row.part_id,
    quantity: row.qty,
    unit_price: row.unit_price,
    line_total: row.line_total,
    is_warranty: row.is_warranty,
    core_charge: row.core_charge,
    core_returned: row.core_returned,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
