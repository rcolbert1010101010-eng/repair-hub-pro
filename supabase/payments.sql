-- Payments table for tracking order payments (work orders, sales orders)

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  order_type text not null,
  order_id uuid not null,
  amount numeric(12,2) not null check (amount >= 0),
  method text not null,
  reference text,
  notes text,
  voided_at timestamptz,
  void_reason text
);

create index if not exists idx_payments_order on payments(order_type, order_id);
create index if not exists idx_payments_created_at on payments(created_at desc);
