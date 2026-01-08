import { supabase } from './client';

import type {
  Customer,
  ManufacturedProduct,
  ManufacturedProductOption,
  ManufacturingBuild,
  ManufacturingBuildSelectedOption,
  ManufacturedProductType,
  ManufacturingBuildStatus,
} from '@/types';

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const mapProduct = (row: any): ManufacturedProduct => ({
  id: row.id,
  name: row.name,
  sku: row.sku,
  product_type: row.product_type,
  description: row.description ?? null,
  base_price: toNumber(row.base_price),
  is_active: row.is_active ?? true,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const mapOption = (row: any): ManufacturedProductOption => ({
  id: row.id,
  product_id: row.product_id,
  name: row.name,
  option_type: row.option_type,
  price_delta: toNumber(row.price_delta),
  sort_order: Number(row.sort_order ?? 0),
  is_active: row.is_active ?? true,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const mapBuild = (
  row: any
): ManufacturingBuild & {
  product?: ManufacturedProduct;
  customer?: Pick<Customer, 'id' | 'company_name'>;
} => ({
  id: row.id,
  build_number: row.build_number,
  customer_id: row.customer_id ?? null,
  unit_id: row.unit_id ?? null,
  product_id: row.product_id,
  status: row.status,
  serial_number: row.serial_number ?? null,
  notes: row.notes ?? null,
  is_active: row.is_active ?? true,
  created_at: row.created_at,
  updated_at: row.updated_at,
  product: row.manufactured_products ? mapProduct(row.manufactured_products) : undefined,
  customer: row.customers
    ? { id: row.customers.id, company_name: row.customers.company_name }
    : undefined,
});

const mapSelectedOption = (row: any): ManufacturingBuildSelectedOption => ({
  id: row.id,
  build_id: row.build_id,
  option_id: row.option_id ?? null,
  option_name_snapshot: row.option_name_snapshot,
  price_delta_snapshot: toNumber(row.price_delta_snapshot),
  is_active: row.is_active ?? true,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export type ManufacturingBuildFilters = {
  status?: ManufacturingBuildStatus;
  includeInactive?: boolean;
};

export type ManufacturingBuildWithRelations = ManufacturingBuild & {
  product?: ManufacturedProduct;
  customer?: Pick<Customer, 'id' | 'company_name'>;
};

export async function fetchManufacturedProducts({
  includeInactive = false,
  productType,
}: {
  includeInactive?: boolean;
  productType?: ManufacturedProductType;
} = {}) {
  let query = supabase.from('manufactured_products').select('*');

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }
  if (productType) {
    query = query.eq('product_type', productType);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export async function fetchManufacturedProduct(id: string) {
  const { data, error } = await supabase
    .from('manufactured_products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('Manufactured product not found');
  }

  return mapProduct(data);
}

export async function createManufacturedProduct(input: {
  name: string;
  sku: string;
  product_type: ManufacturedProductType;
  base_price: number;
  description?: string | null;
  is_active?: boolean;
}) {
  const { data, error } = await supabase
    .from('manufactured_products')
    .insert({
      name: input.name,
      sku: input.sku,
      product_type: input.product_type,
      base_price: input.base_price,
      description: input.description ?? null,
      is_active: input.is_active ?? true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapProduct(data);
}

export async function updateManufacturedProduct(
  id: string,
  patch: Partial<{
    name: string;
    sku: string;
    product_type: ManufacturedProductType;
    base_price: number;
    description: string | null;
    is_active: boolean;
  }>
) {
  const { data, error } = await supabase
    .from('manufactured_products')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return mapProduct(data);
}

export async function deactivateManufacturedProduct(id: string) {
  const { data, error } = await supabase
    .from('manufactured_products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return mapProduct(data);
}

export async function fetchManufacturedProductOptions(productId: string) {
  const { data, error } = await supabase
    .from('manufactured_product_options')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapOption);
}

export async function createManufacturedProductOption(input: {
  product_id: string;
  name: string;
  option_type: string;
  price_delta: number;
  sort_order?: number;
  is_active?: boolean;
}) {
  const { data, error } = await supabase
    .from('manufactured_product_options')
    .insert({
      product_id: input.product_id,
      name: input.name,
      option_type: input.option_type,
      price_delta: input.price_delta,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapOption(data);
}

export async function updateManufacturedProductOption(
  id: string,
  patch: Partial<{
    name: string;
    option_type: string;
    price_delta: number;
    sort_order: number;
    is_active: boolean;
  }>
) {
  const { data, error } = await supabase
    .from('manufactured_product_options')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return mapOption(data);
}

export async function deactivateManufacturedProductOption(id: string) {
  const { data, error } = await supabase
    .from('manufactured_product_options')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return mapOption(data);
}

export async function fetchManufacturingBuilds(filters: ManufacturingBuildFilters = {}) {
  let query = supabase
    .from('manufacturing_builds')
    .select(`
      *,
      manufactured_products (
        id,
        name,
        sku,
        product_type,
        base_price,
        is_active
      ),
      customers (
        id,
        company_name
      )
    `)
    .order('created_at', { ascending: false });

  if (!filters.includeInactive) {
    query = query.eq('is_active', true);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []).map((row) => mapBuild(row));
}

export async function fetchManufacturingBuild(id: string) {
  const { data, error } = await supabase
    .from('manufacturing_builds')
    .select(`
      *,
      manufactured_products (
        id,
        name,
        sku,
        product_type,
        base_price,
        is_active
      ),
      customers (
        id,
        company_name
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('Manufacturing build not found');
  }

  return mapBuild(data);
}

export async function createManufacturingBuild(input: {
  build_number: string;
  product_id: string;
  customer_id?: string | null;
  unit_id?: string | null;
  status?: ManufacturingBuildStatus;
  notes?: string | null;
}) {
  const { data, error } = await supabase
    .from('manufacturing_builds')
    .insert({
      build_number: input.build_number,
      product_id: input.product_id,
      customer_id: input.customer_id ?? null,
      unit_id: input.unit_id ?? null,
      status: input.status ?? 'ENGINEERING',
      notes: input.notes ?? null,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapBuild(data);
}

export async function updateManufacturingBuild(
  id: string,
  patch: Partial<{
    customer_id: string | null;
    unit_id: string | null;
    status: ManufacturingBuildStatus;
    notes: string | null;
    serial_number: string | null;
    is_active: boolean;
  }>
) {
  const { data, error } = await supabase
    .from('manufacturing_builds')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('Manufacturing build not found');
  }
  return mapBuild(data);
}

export async function deactivateManufacturingBuild(id: string) {
  const { data, error } = await supabase
    .from('manufacturing_builds')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return mapBuild(data);
}

export async function fetchManufacturingBuildSelectedOptions(buildId: string) {
  const { data, error } = await supabase
    .from('manufacturing_build_selected_options')
    .select('*')
    .eq('build_id', buildId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapSelectedOption);
}

export async function addManufacturingBuildSelectedOption(input: {
  build_id: string;
  option_id: string | null;
  option_name_snapshot: string;
  price_delta_snapshot: number;
}) {
  const { data, error } = await supabase
    .from('manufacturing_build_selected_options')
    .insert({
      build_id: input.build_id,
      option_id: input.option_id,
      option_name_snapshot: input.option_name_snapshot,
      price_delta_snapshot: input.price_delta_snapshot,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapSelectedOption(data);
}

export async function deactivateManufacturingBuildSelectedOption(id: string) {
  const { data, error } = await supabase
    .from('manufacturing_build_selected_options')
    .update({ is_active: false })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return mapSelectedOption(data);
}
