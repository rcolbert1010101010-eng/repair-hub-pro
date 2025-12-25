import type {
  Customer,
  Part,
  PartCategory,
  Technician,
  Unit,
  Vendor,
} from '@/types';
import { staticDate } from '@/lib/storeUtils';

// Walk-in customer
export const WALKIN_CUSTOMER: Customer = {
  id: 'walkin',
  company_name: 'Walk-in Customer',
  contact_name: null,
  phone: null,
  email: null,
  address: null,
  notes: 'Default walk-in customer for counter sales',
  is_active: true,
  created_at: staticDate,
  updated_at: staticDate,
};

// Sample Vendors
export const SAMPLE_VENDORS: Vendor[] = [
  { id: 'vendor-1', vendor_name: 'FleetParts Pro', phone: '555-100-1000', email: 'orders@fleetpartspro.com', notes: 'Primary parts supplier', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'vendor-2', vendor_name: 'Diesel Direct', phone: '555-200-2000', email: 'sales@dieseldirect.com', notes: 'Diesel engine parts specialist', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'vendor-3', vendor_name: 'HeavyDuty Supply Co', phone: '555-300-3000', email: 'support@hdsc.com', notes: null, is_active: true, created_at: staticDate, updated_at: staticDate },
];

// Sample Categories
export const SAMPLE_CATEGORIES: PartCategory[] = [
  { id: 'cat-1', category_name: 'Brakes', description: 'Brake pads, rotors, calipers, drums', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'cat-2', category_name: 'Engine', description: 'Engine components and filters', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'cat-3', category_name: 'Electrical', description: 'Batteries, starters, alternators', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'cat-4', category_name: 'Suspension', description: 'Shocks, struts, springs', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'cat-5', category_name: 'Fluids & Filters', description: 'Oil, coolant, filters', is_active: true, created_at: staticDate, updated_at: staticDate },
];

// Sample Parts
export const SAMPLE_PARTS: Part[] = [
  { id: 'part-1', part_number: 'BRK-001', description: 'Heavy Duty Brake Pad Set (Front)', vendor_id: 'vendor-1', category_id: 'cat-1', cost: 45.00, selling_price: 89.99, quantity_on_hand: 24, core_required: false, core_charge: 0, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-2', part_number: 'BRK-002', description: 'Heavy Duty Brake Pad Set (Rear)', vendor_id: 'vendor-1', category_id: 'cat-1', cost: 42.00, selling_price: 84.99, quantity_on_hand: 18, core_required: false, core_charge: 0, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-3', part_number: 'BRK-010', description: 'Brake Rotor - 15\" HD', vendor_id: 'vendor-1', category_id: 'cat-1', cost: 120.00, selling_price: 189.99, quantity_on_hand: 8, core_required: true, core_charge: 35.00, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-4', part_number: 'ENG-001', description: 'Oil Filter - Heavy Duty', vendor_id: 'vendor-2', category_id: 'cat-2', cost: 8.50, selling_price: 18.99, quantity_on_hand: 50, core_required: false, core_charge: 0, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-5', part_number: 'ENG-002', description: 'Air Filter - Commercial Truck', vendor_id: 'vendor-2', category_id: 'cat-2', cost: 25.00, selling_price: 49.99, quantity_on_hand: 30, core_required: false, core_charge: 0, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-6', part_number: 'ENG-015', description: 'Fuel Injector - Diesel', vendor_id: 'vendor-2', category_id: 'cat-2', cost: 180.00, selling_price: 299.99, quantity_on_hand: 6, core_required: true, core_charge: 75.00, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-7', part_number: 'ELC-001', description: 'Heavy Duty Battery - Group 31', vendor_id: 'vendor-3', category_id: 'cat-3', cost: 145.00, selling_price: 229.99, quantity_on_hand: 12, core_required: true, core_charge: 25.00, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-8', part_number: 'ELC-010', description: 'Starter Motor - Diesel HD', vendor_id: 'vendor-3', category_id: 'cat-3', cost: 280.00, selling_price: 449.99, quantity_on_hand: 4, core_required: true, core_charge: 85.00, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-9', part_number: 'ELC-015', description: 'Alternator - 200A HD', vendor_id: 'vendor-3', category_id: 'cat-3', cost: 195.00, selling_price: 329.99, quantity_on_hand: 5, core_required: true, core_charge: 65.00, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-10', part_number: 'SUS-001', description: 'Shock Absorber - Front HD', vendor_id: 'vendor-1', category_id: 'cat-4', cost: 85.00, selling_price: 149.99, quantity_on_hand: 16, core_required: false, core_charge: 0, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-11', part_number: 'FLT-001', description: 'Engine Oil 15W-40 (1 Gal)', vendor_id: 'vendor-2', category_id: 'cat-5', cost: 18.00, selling_price: 32.99, quantity_on_hand: 48, core_required: false, core_charge: 0, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'part-12', part_number: 'FLT-005', description: 'Coolant - HD Extended Life (1 Gal)', vendor_id: 'vendor-2', category_id: 'cat-5', cost: 22.00, selling_price: 39.99, quantity_on_hand: 36, core_required: false, core_charge: 0, is_active: true, created_at: staticDate, updated_at: staticDate },
];

// Sample Customers
export const SAMPLE_CUSTOMERS: Customer[] = [
  { id: 'cust-1', company_name: 'ABC Trucking Inc', contact_name: 'John Smith', phone: '555-111-1111', email: 'john@abctrucking.com', address: '123 Industrial Blvd, Houston, TX 77001', notes: 'Fleet account - Net 30', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'cust-2', company_name: 'Metro Logistics', contact_name: 'Sarah Johnson', phone: '555-222-2222', email: 'sarah@metrologistics.com', address: '456 Commerce St, Dallas, TX 75201', notes: 'Preferred customer', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'cust-3', company_name: 'Sunrise Freight', contact_name: 'Mike Davis', phone: '555-333-3333', email: 'mike@sunrisefreight.com', address: '789 Highway 45, Austin, TX 78701', notes: null, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'cust-4', company_name: 'Central Delivery Co', contact_name: 'Lisa Brown', phone: '555-444-4444', email: 'lisa@centraldelivery.com', address: '321 Main St, San Antonio, TX 78201', notes: 'COD only', is_active: true, created_at: staticDate, updated_at: staticDate },
];

// Sample Units
export const SAMPLE_UNITS: Unit[] = [
  { id: 'unit-1', customer_id: 'cust-1', unit_name: 'Truck 101', vin: '1HGCM82633A123456', year: 2021, make: 'Freightliner', model: 'Cascadia', mileage: 245000, hours: null, notes: 'Primary long-haul unit', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'unit-2', customer_id: 'cust-1', unit_name: 'Truck 102', vin: '1HGCM82633A789012', year: 2020, make: 'Kenworth', model: 'T680', mileage: 312000, hours: null, notes: null, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'unit-3', customer_id: 'cust-1', unit_name: 'Truck 103', vin: '1HGCM82633A345678', year: 2022, make: 'Peterbilt', model: '579', mileage: 128000, hours: null, notes: 'Newer unit', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'unit-4', customer_id: 'cust-2', unit_name: 'Van A1', vin: '2FMZA52283BA98765', year: 2019, make: 'Ford', model: 'Transit 350', mileage: 89000, hours: null, notes: 'Delivery van', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'unit-5', customer_id: 'cust-2', unit_name: 'Box Truck B1', vin: '3ALACXDT7JDAB1234', year: 2020, make: 'International', model: 'MV607', mileage: 156000, hours: null, notes: null, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'unit-6', customer_id: 'cust-3', unit_name: 'Rig 01', vin: '1XP5DB9X7YN567890', year: 2018, make: 'Volvo', model: 'VNL 760', mileage: 425000, hours: null, notes: 'High mileage - monitor closely', is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'unit-7', customer_id: 'cust-4', unit_name: 'Sprinter 1', vin: 'WDAPF4CC5E9876543', year: 2021, make: 'Mercedes', model: 'Sprinter 2500', mileage: 67000, hours: null, notes: null, is_active: true, created_at: staticDate, updated_at: staticDate },
];

// Sample Technicians
export const SAMPLE_TECHNICIANS: Technician[] = [
  { id: 'tech-1', name: 'Carlos Rodriguez', hourly_cost_rate: 35.00, default_billable_rate: 125.00, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'tech-2', name: 'James Mitchell', hourly_cost_rate: 40.00, default_billable_rate: 125.00, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'tech-3', name: 'Tony Williams', hourly_cost_rate: 32.00, default_billable_rate: 125.00, is_active: true, created_at: staticDate, updated_at: staticDate },
  { id: 'tech-4', name: 'David Chen', hourly_cost_rate: 45.00, default_billable_rate: 150.00, is_active: true, created_at: staticDate, updated_at: staticDate },
];
