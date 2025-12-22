import { supabase } from "./client";
import type { Vendor, PartCategory, Part } from "@/types";
import { mapVendor, mapCategory, mapPart, type DbVendor, type DbCategory, type DbPart } from "./mappers";

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
    .select("id,part_number,description,vendor_id,category_id,cost,sell_price,quantity_on_hand,core_required,core_charge_amount,is_active,created_at,updated_at")
    .eq("is_active", true)
    .order("part_number", { ascending: true });

  if (error) throw error;
  return (data as DbPart[]).map(mapPart);
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
