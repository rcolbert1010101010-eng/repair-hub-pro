import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

function loadEnvLocal() {
  const p = path.resolve(process.cwd(), ".env.local");
  const txt = fs.readFileSync(p, "utf8");
  const env = {};
  for (const line of txt.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim();
    env[k] = v;
  }
  return env;
}

const env = loadEnvLocal();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

// --- Seed data (matches your UI expectations, mapped to DB schema) ---
const vendors = [
  { name: "FleetParts Pro", phone: "555-100-1000", email: "orders@fleetpartspro.com", notes: "Primary parts supplier", is_active: true },
  { name: "Diesel Direct", phone: "555-200-2000", email: "sales@dieseldirect.com", notes: "Diesel engine parts specialist", is_active: true },
  { name: "HeavyDuty Supply Co", phone: "555-300-3000", email: "support@hdsc.com", notes: null, is_active: true },
];

const categories = [
  { name: "Brakes", description: "Brake pads, rotors, calipers, drums", is_active: true },
  { name: "Engine", description: "Engine components and filters", is_active: true },
  { name: "Electrical", description: "Batteries, starters, alternators", is_active: true },
];

const partsTemplate = [
  // part_number, description, vendor_name, category_name, cost, sell_price, qoh, core_required, core_charge_amount
  ["BRK-001", "Heavy Duty Brake Pad Set (Front)", "FleetParts Pro", "Brakes", 45.00, 89.99, 24, false, 0],
  ["BRK-010", 'Brake Rotor - 15" HD', "FleetParts Pro", "Brakes", 120.00, 189.99, 8, true, 35.00],
  ["ENG-001", "Oil Filter - Heavy Duty", "Diesel Direct", "Engine", 8.50, 18.99, 50, false, 0],
  ["ENG-015", "Fuel Injector - Diesel", "Diesel Direct", "Engine", 180.00, 299.99, 6, true, 75.00],
  ["ELC-001", "Heavy Duty Battery - Group 31", "HeavyDuty Supply Co", "Electrical", 145.00, 229.99, 12, true, 25.00],
];

async function ensureSeed() {
  // Only seed if empty
  const { count: vCount, error: vCountErr } = await supabase
    .from("vendors")
    .select("*", { count: "exact", head: true });
  if (vCountErr) throw vCountErr;

  const { count: cCount, error: cCountErr } = await supabase
    .from("part_categories")
    .select("*", { count: "exact", head: true });
  if (cCountErr) throw cCountErr;

  const { count: pCount, error: pCountErr } = await supabase
    .from("parts")
    .select("*", { count: "exact", head: true });
  if (pCountErr) throw pCountErr;

  if ((vCount ?? 0) > 0 || (cCount ?? 0) > 0 || (pCount ?? 0) > 0) {
    console.log("Seed skipped: vendors/categories/parts already contain data.");
    return;
  }

  // Insert vendors
  const { data: vData, error: vErr } = await supabase
    .from("vendors")
    .insert(vendors)
    .select("id,name");
  if (vErr) throw vErr;

  // Insert categories
  const { data: cData, error: cErr } = await supabase
    .from("part_categories")
    .insert(categories)
    .select("id,name");
  if (cErr) throw cErr;

  const vendorIdByName = new Map(vData.map((v) => [v.name, v.id]));
  const categoryIdByName = new Map(cData.map((c) => [c.name, c.id]));

  const parts = partsTemplate.map(([part_number, description, vName, cName, cost, sell_price, qoh, core_required, core_charge_amount]) => ({
    part_number,
    description,
    vendor_id: vendorIdByName.get(vName),
    category_id: categoryIdByName.get(cName),
    cost,
    sell_price,
    quantity_on_hand: qoh,
    core_required,
    core_charge_amount,
    is_active: true,
  }));

  for (const p of parts) {
    if (!p.vendor_id || !p.category_id) {
      throw new Error(`Missing vendor/category mapping for part ${p.part_number}`);
    }
  }

  const { error: pErr } = await supabase.from("parts").insert(parts);
  if (pErr) throw pErr;

  console.log("Seed complete: vendors/categories/parts inserted.");
}

ensureSeed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
