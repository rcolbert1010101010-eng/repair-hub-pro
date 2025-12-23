import { supabase } from "./client";
import type { Unit } from "@/types";
import { mapUnit, type DbUnit } from "./mappers";

const UNIT_COLUMNS =
  "id,customer_id,unit_name,vin,year,make,model,mileage,hours,notes,is_active,created_at,updated_at";

export async function fetchUnits(): Promise<Unit[]> {
  const { data, error } = await supabase
    .from("units")
    .select(UNIT_COLUMNS)
    .eq("is_active", true)
    .order("unit_name", { ascending: true });

  if (error) throw error;
  return (data as DbUnit[]).map(mapUnit);
}
