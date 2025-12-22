import { supabase } from "./client";
import type { Vendor, PartCategory, Part } from "@/types";
import { mapVendor, mapCategory, mapPart, type DbVendor, type DbCategory, type DbPart } from "./mappers";

const PART_COLUMNS =
  "id,part_number,description,vendor_id,category_id,cost,sell_price,quantity_on_hand,core_required,core_charge_amount,is_active,created_at,updated_at";

export async function fetchVendors(): Promise<Vendor[]> {
  const { data, error } = await supabase
    .from("vendors")
    .select("id,name,phone,email,notes,is_active,created_at,updated_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data as DbVendor[]).map(mapVendor);
}

export async function fetchCategories(): Promise<PartCategory[]> {
  const { data, error } = await supabase
    .from("part_categories")
    .select("id,name,description,is_active,created_at,updated_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data as DbCategory[]).map(mapCategory);
}

export async function fetchParts(): Promise<Part[]> {
  const { data, error } = await supabase
    .from("parts")
    .select(PART_COLUMNS)
    .eq("is_active", true)
    .order("part_number", { ascending: true });

  if (error) throw error;
  return (data as DbPart[]).map(mapPart);
}

export async function fetchPartById(id: string): Promise<Part | null> {
  const { data, error } = await supabase.from("parts").select(PART_COLUMNS).eq("id", id).maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapPart(data as DbPart);
}

export async function createPart(input: {
  part_number: string;
  description: string | null;
  vendor_id: string;
  category_id: string;
  cost: number;
  selling_price: number;
  quantity_on_hand: number;
  core_required: boolean;
  core_charge: number;
}): Promise<Part> {
  const { data, error } = await supabase
    .from("parts")
    .insert({
      part_number: input.part_number,
      description: input.description,
      vendor_id: input.vendor_id,
      category_id: input.category_id,
      cost: input.cost,
      sell_price: input.selling_price,
      quantity_on_hand: input.quantity_on_hand,
      core_required: input.core_required,
      core_charge_amount: input.core_charge,
      is_active: true,
    })
    .select(PART_COLUMNS)
    .single();

  if (error) throw error;
  return mapPart(data as DbPart);
}

export async function updatePartById(
  id: string,
  input: {
    part_number: string;
    description: string | null;
    vendor_id: string;
    category_id: string;
    cost: number;
    selling_price: number;
    quantity_on_hand: number;
    core_required: boolean;
    core_charge: number;
  }
): Promise<Part> {
  const { data, error } = await supabase
    .from("parts")
    .update({
      part_number: input.part_number,
      description: input.description,
      vendor_id: input.vendor_id,
      category_id: input.category_id,
      cost: input.cost,
      sell_price: input.selling_price,
      quantity_on_hand: input.quantity_on_hand,
      core_required: input.core_required,
      core_charge_amount: input.core_charge,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(PART_COLUMNS)
    .single();

  if (error) throw error;
  return mapPart(data as DbPart);
}

export async function deactivatePartById(id: string): Promise<void> {
  const { error } = await supabase
    .from("parts")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function createVendor(input: {
  vendor_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
}): Promise<Vendor> {
  const { data, error } = await supabase
    .from("vendors")
    .insert({
      name: input.vendor_name,
      phone: input.phone,
      email: input.email,
      notes: input.notes,
      is_active: true,
    })
    .select("id,name,phone,email,notes,is_active,created_at,updated_at")
    .single();

  if (error) throw error;
  return mapVendor(data as DbVendor);
}

export async function fetchVendorById(id: string): Promise<Vendor | null> {
  const { data, error } = await supabase
    .from("vendors")
    .select("id,name,phone,email,notes,is_active,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapVendor(data as DbVendor);
}

export async function updateVendorById(
  id: string,
  input: { vendor_name: string; phone: string | null; email: string | null; notes: string | null }
): Promise<Vendor> {
  const { data, error } = await supabase
    .from("vendors")
    .update({
      name: input.vendor_name,
      phone: input.phone,
      email: input.email,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id,name,phone,email,notes,is_active,created_at,updated_at")
    .single();

  if (error) throw error;
  return mapVendor(data as DbVendor);
}

export async function deactivateVendorById(id: string): Promise<void> {
  const { error } = await supabase
    .from("vendors")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function createCategory(input: {
  category_name: string;
  description: string | null;
}): Promise<PartCategory> {
  const { data, error } = await supabase
    .from("part_categories")
    .insert({
      name: input.category_name,
      description: input.description,
      is_active: true,
    })
    .select("id,name,description,is_active,created_at,updated_at")
    .single();

  if (error) throw error;
  return mapCategory(data as DbCategory);
}

export async function fetchCategoryById(id: string): Promise<PartCategory | null> {
  const { data, error } = await supabase
    .from("part_categories")
    .select("id,name,description,is_active,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapCategory(data as DbCategory);
}

export async function updateCategoryById(
  id: string,
  input: { category_name: string; description: string | null }
): Promise<PartCategory> {
  const { data, error } = await supabase
    .from("part_categories")
    .update({
      name: input.category_name,
      description: input.description,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id,name,description,is_active,created_at,updated_at")
    .single();

  if (error) throw error;
  return mapCategory(data as DbCategory);
}

export async function deactivateCategoryById(id: string): Promise<void> {
  const { error } = await supabase
    .from("part_categories")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
