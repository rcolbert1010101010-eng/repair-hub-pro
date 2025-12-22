import type { Vendor, PartCategory, Part } from "@/types";

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
