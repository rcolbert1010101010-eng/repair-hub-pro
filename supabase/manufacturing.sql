-- Manufacturing module schema

create table if not exists manufactured_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null unique,
  product_type text not null,
  description text,
  base_price numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_manufactured_products_product_type on manufactured_products(product_type);

create table if not exists manufactured_product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references manufactured_products(id) on delete cascade,
  name text not null,
  option_type text not null,
  price_delta numeric not null default 0,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_manufactured_product_options_product_id on manufactured_product_options(product_id);

create table if not exists manufacturing_builds (
  id uuid primary key default gen_random_uuid(),
  build_number text not null unique,
  customer_id uuid references customers(id),
  unit_id uuid references units(id),
  product_id uuid not null references manufactured_products(id),
  status text not null default 'ENGINEERING',
  serial_number text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_manufacturing_builds_product_id on manufacturing_builds(product_id);
create index if not exists idx_manufacturing_builds_customer_id on manufacturing_builds(customer_id);

create table if not exists manufacturing_build_selected_options (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references manufacturing_builds(id) on delete cascade,
  option_id uuid references manufactured_product_options(id),
  option_name_snapshot text not null,
  price_delta_snapshot numeric not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_selected_options_build_id on manufacturing_build_selected_options(build_id);

-- Seed sample data
insert into manufactured_products (name, sku, product_type, description, base_price)
values
  ('HD Dump Body', 'DB-1000', 'DUMP_BODY', 'Heavy-duty dump body designed for municipal fleets.', 32000),
  ('Tandem Flatbed Trailer', 'TR-2000', 'TRAILER', 'Dual-axle trailer for hauling equipment.', 27500)
on conflict (sku) do nothing;

with dump as (
  select id from manufactured_products where sku = 'DB-1000'
), trailer as (
  select id from manufactured_products where sku = 'TR-2000'
)
insert into manufactured_product_options (product_id, name, option_type, price_delta, sort_order)
values
  ((select id from dump), 'Heavy-Duty Hoist', 'HYDRAULICS', 4200, 10),
  ((select id from dump), 'Reinforced Frame', 'STRUCTURE', 2800, 20),
  ((select id from trailer), 'Dovetail Ramp', 'ACCESSORY', 1500, 10),
  ((select id from trailer), 'Toolbox Pack', 'ACCESSORY', 800, 20)
on conflict do nothing;

with build_product as (
  select id from manufactured_products where sku = 'DB-1000'
)
insert into manufacturing_builds (build_number, product_id, status, notes)
select 'MB-1001', (select id from build_product), 'ENGINEERING', 'Example dump body build' 
on conflict (build_number) do nothing;

with sample_build as (
  select id from manufacturing_builds where build_number = 'MB-1001'
), hoist_option as (
  select id, name, price_delta from manufactured_product_options where name = 'Heavy-Duty Hoist'
)
insert into manufacturing_build_selected_options (build_id, option_id, option_name_snapshot, price_delta_snapshot)
select
  (select id from sample_build),
  hoist_option.id,
  hoist_option.name,
  hoist_option.price_delta
from hoist_option
on conflict do nothing;
