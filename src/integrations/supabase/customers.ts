import { supabase } from "./client";
import type { Customer } from "@/types";
import { mapCustomer, type DbCustomer } from "./mappers";

const CUSTOMER_COLUMNS =
  "id,company_name,contact_name,phone,email,address,notes,is_active,created_at,updated_at";

export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_COLUMNS)
    .eq("is_active", true)
    .order("company_name", { ascending: true });

  if (error) throw error;
  return (data as DbCustomer[]).map(mapCustomer);
}

export async function createCustomer(input: {
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .insert({
      company_name: input.company_name,
      contact_name: input.contact_name,
      phone: input.phone,
      email: input.email,
      address: input.address,
      notes: input.notes,
      is_active: true,
    })
    .select(CUSTOMER_COLUMNS)
    .single();

  if (error) throw error;
  return mapCustomer(data as DbCustomer);
}
