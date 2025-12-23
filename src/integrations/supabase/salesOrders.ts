import { supabase } from "./client";
import type { SalesOrder, SalesOrderLine } from "@/types";
import { mapSalesOrder, mapSalesOrderLine, type DbSalesOrder, type DbSalesOrderLine } from "./mappers";

const ORDER_COLUMNS =
  "id,order_number,customer_id,unit_id,status,notes,tax_rate,subtotal,tax_amount,total,invoiced_at,created_at,updated_at";

const LINE_COLUMNS =
  "id,sales_order_id,part_id,qty,unit_price,line_total,is_warranty,core_charge,core_returned,created_at,updated_at";

export async function fetchSalesOrdersWithLines(): Promise<{ orders: SalesOrder[]; lines: SalesOrderLine[] }> {
  const [{ data: ordersData, error: ordersError }, { data: linesData, error: linesError }] = await Promise.all([
    supabase.from("sales_orders").select(ORDER_COLUMNS).order("created_at", { ascending: false }),
    supabase.from("sales_order_lines").select(LINE_COLUMNS),
  ]);

  if (ordersError) throw ordersError;
  if (linesError) throw linesError;

  return {
    orders: (ordersData as DbSalesOrder[]).map(mapSalesOrder),
    lines: (linesData as DbSalesOrderLine[]).map(mapSalesOrderLine),
  };
}

export async function createSalesOrder(input: {
  customer_id: string;
  unit_id: string | null;
  tax_rate: number;
}): Promise<SalesOrder> {
  const { data, error } = await supabase
    .from("sales_orders")
    .insert({
      customer_id: input.customer_id,
      unit_id: input.unit_id,
      status: "OPEN",
      notes: null,
      tax_rate: input.tax_rate,
      subtotal: 0,
      tax_amount: 0,
      total: 0,
    })
    .select(ORDER_COLUMNS)
    .single();

  if (error) throw error;
  return mapSalesOrder(data as DbSalesOrder);
}

export async function createSalesOrderLine(input: {
  sales_order_id: string;
  part_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  is_warranty: boolean;
  core_charge: number;
}): Promise<SalesOrderLine> {
  const { data, error } = await supabase
    .from("sales_order_lines")
    .insert({
      sales_order_id: input.sales_order_id,
      part_id: input.part_id,
      qty: input.quantity,
      unit_price: input.unit_price,
      unit_price_snapshot: input.unit_price,
      line_total: input.line_total,
      is_warranty: input.is_warranty,
      core_charge: input.core_charge,
      core_returned: false,
    })
    .select(LINE_COLUMNS)
    .single();

  if (error) throw error;
  return mapSalesOrderLine(data as DbSalesOrderLine);
}

export async function updateSalesOrderLine(input: {
  id: string;
  quantity: number;
  line_total: number;
}): Promise<SalesOrderLine> {
  const { data, error } = await supabase
    .from("sales_order_lines")
    .update({
      qty: input.quantity,
      line_total: input.line_total,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(LINE_COLUMNS)
    .single();

  if (error) throw error;
  return mapSalesOrderLine(data as DbSalesOrderLine);
}

export async function deleteSalesOrderLine(lineId: string): Promise<void> {
  const { error } = await supabase.from("sales_order_lines").delete().eq("id", lineId);
  if (error) throw error;
}
