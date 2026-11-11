-- Initial Supabase schema for AUTONOMOUS X. Apply with Supabase CLI or SQL editor.
create extension if not exists postgis with schema extensions;

create table if not exists public.simulation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  seed integer not null,
  status text not null default 'created' check (status in ('created','running','paused','completed','failed')),
  config jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  simulation_run_id uuid not null references public.simulation_runs(id) on delete cascade,
  name text not null,
  location geography(point, 4326) not null,
  available boolean not null default true,
  capacity_kg numeric(12,3) check (capacity_kg is null or capacity_kg > 0),
  created_at timestamptz not null default now(),
  unique (simulation_run_id, name)
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  simulation_run_id uuid not null references public.simulation_runs(id) on delete cascade,
  sku text not null,
  name text not null,
  unit_weight_kg numeric(10,3) not null check (unit_weight_kg > 0),
  created_at timestamptz not null default now(),
  unique (simulation_run_id, sku)
);

create table if not exists public.warehouse_inventory (
  id uuid primary key default gen_random_uuid(),
  simulation_run_id uuid not null references public.simulation_runs(id) on delete cascade,
  warehouse_id uuid not null references public.warehouses(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0 and reserved_quantity <= quantity),
  updated_at timestamptz not null default now(),
  unique (warehouse_id, inventory_item_id)
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  simulation_run_id uuid not null references public.simulation_runs(id) on delete cascade,
  name text not null,
  capacity_kg numeric(12,3) not null check (capacity_kg > 0),
  current_load_kg numeric(12,3) not null default 0 check (current_load_kg >= 0 and current_load_kg <= capacity_kg),
  in_transit boolean not null default false,
  location geography(point, 4326) not null,
  status text not null default 'available' check (status in ('available','assigned','en_route','broken_down','offline')),
  created_at timestamptz not null default now(),
  unique (simulation_run_id, name)
);

create table if not exists public.delivery_locations (
  id uuid primary key default gen_random_uuid(),
  simulation_run_id uuid not null references public.simulation_runs(id) on delete cascade,
  label text not null,
  region text not null,
  location geography(point, 4326) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  simulation_run_id uuid not null references public.simulation_runs(id) on delete cascade,
  idempotency_key text,
  delivery_location_id uuid not null references public.delivery_locations(id),
  priority smallint not null default 3 check (priority between 1 and 5),
  status text not null default 'pending' check (status in ('pending','assigned','in_transit','delivered','unfulfillable','cancelled')),
  time_window_start timestamptz,
  time_window_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (time_window_end is null or time_window_start is null or time_window_end >= time_window_start),
  unique (simulation_run_id, idempotency_key)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  simulation_run_id uuid not null references public.simulation_runs(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items(id),
  quantity integer not null check (quantity > 0),
  unit_weight_kg numeric(10,3) not null check (unit_weight_kg > 0)
);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  simulation_run_id uuid not null references public.simulation_runs(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id),
  warehouse_id uuid references public.warehouses(id),
  status text not null default 'planned' check (status in ('planned','active','completed','cancelled')),
  solver_status text not null,
  distance_m numeric(14,2) not null default 0 check (distance_m >= 0),
  duration_s numeric(14,2) not null default 0 check (duration_s >= 0),
  graph_source text not null,
  geometry geometry(linestring, 4326),
  created_at timestamptz not null default now()
);

create table if not exists public.route_stops (
  id uuid primary key default gen_random_uuid(),
  simulation_run_id uuid not null references public.simulation_runs(id) on delete cascade,
  route_id uuid not null references public.routes(id) on delete cascade,
  order_id uuid not null references public.orders(id),
  sequence integer not null check (sequence >= 0),
  status text not null default 'planned' check (status in ('planned','in_progress','completed','skipped')),
  arrival_time timestamptz,
  completed_at timestamptz,
  unique (route_id, sequence)
);
create unique index if not exists route_stops_one_active_order
  on public.route_stops(order_id) where status in ('planned','in_progress');

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  simulation_run_id uuid not null references public.simulation_runs(id) on delete cascade,
  kind text not null check (kind in ('traffic','road_closure','vehicle_breakdown','warehouse_outage','weather')),
  status text not null default 'active' check (status in ('active','resolved')),
  severity smallint not null default 1 check (severity between 1 and 5),
  affected_entity_id uuid,
  location geography(point, 4326),
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.simulation_events (
  id uuid primary key default gen_random_uuid(),
  simulation_run_id uuid not null references public.simulation_runs(id) on delete cascade,
  event_key text not null,
  event_type text not null,
  schema_version integer not null default 1 check (schema_version > 0),
  payload jsonb not null,
  occurred_at timestamptz not null default now(),
  unique (simulation_run_id, event_key)
);

create table if not exists public.optimization_runs (
  id uuid primary key default gen_random_uuid(),
  simulation_run_id uuid not null references public.simulation_runs(id) on delete cascade,
  solver_name text not null,
  solver_status text not null,
  objective_value numeric,
  runtime_ms integer not null check (runtime_ms >= 0),
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_decisions (
  id uuid primary key default gen_random_uuid(),
  simulation_run_id uuid not null references public.simulation_runs(id) on delete cascade,
  agent_name text not null,
  event_key text,
  proposal jsonb not null,
  accepted boolean not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.demand_forecasts (
  id uuid primary key default gen_random_uuid(),
  simulation_run_id uuid not null references public.simulation_runs(id) on delete cascade,
  region text not null,
  period_start timestamptz not null,
  horizon_seconds integer not null check (horizon_seconds > 0),
  predicted_quantity numeric(12,3) not null check (predicted_quantity >= 0),
  model_name text not null,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (simulation_run_id, region, period_start, model_name)
);

create table if not exists public.metrics_snapshots (
  id uuid primary key default gen_random_uuid(),
  simulation_run_id uuid not null references public.simulation_runs(id) on delete cascade,
  captured_at timestamptz not null default now(),
  metrics jsonb not null
);

create index if not exists warehouses_run_idx on public.warehouses(simulation_run_id);
create index if not exists warehouses_location_gix on public.warehouses using gist(location);
create index if not exists inventory_run_stock_idx on public.warehouse_inventory(simulation_run_id, warehouse_id, inventory_item_id);
create index if not exists vehicles_run_status_idx on public.vehicles(simulation_run_id, status);
create index if not exists vehicles_location_gix on public.vehicles using gist(location);
create index if not exists delivery_locations_run_region_idx on public.delivery_locations(simulation_run_id, region);
create index if not exists delivery_locations_gix on public.delivery_locations using gist(location);
create index if not exists orders_run_status_created_idx on public.orders(simulation_run_id, status, created_at);
create index if not exists route_stops_order_idx on public.route_stops(order_id);
create index if not exists incidents_run_status_time_idx on public.incidents(simulation_run_id, status, occurred_at);
create index if not exists simulation_events_run_time_idx on public.simulation_events(simulation_run_id, occurred_at);
create index if not exists demand_forecasts_region_time_idx on public.demand_forecasts(simulation_run_id, region, period_start);
create index if not exists metrics_snapshots_run_time_idx on public.metrics_snapshots(simulation_run_id, captured_at);

-- Atomic stock reservation for concurrent API callers. Returns false when stock is insufficient.
create or replace function public.reserve_inventory(
  p_warehouse_id uuid,
  p_inventory_item_id uuid,
  p_quantity integer
) returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare affected integer;
begin
  if p_quantity <= 0 then
    raise exception 'reservation quantity must be positive';
  end if;
  update public.warehouse_inventory
     set reserved_quantity = reserved_quantity + p_quantity,
         updated_at = now()
   where warehouse_id = p_warehouse_id
     and inventory_item_id = p_inventory_item_id
     and quantity - reserved_quantity >= p_quantity;
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

alter table public.simulation_runs enable row level security;
create policy simulation_runs_owner_all on public.simulation_runs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'warehouses','inventory_items','warehouse_inventory','vehicles','delivery_locations','orders',
    'order_items','routes','route_stops','incidents','simulation_events','optimization_runs',
    'agent_decisions','demand_forecasts','metrics_snapshots'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy %I on public.%I for all using (exists (select 1 from public.simulation_runs r where r.id = simulation_run_id and r.user_id = auth.uid())) with check (exists (select 1 from public.simulation_runs r where r.id = simulation_run_id and r.user_id = auth.uid()))',
      table_name || '_owner_all', table_name
    );
  end loop;
end $$;

-- Enable Realtime for operational tables when the Supabase publication exists.
do $$
declare table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array[
      'vehicles','warehouse_inventory','orders','incidents','simulation_events'
    ] loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      exception when duplicate_object then
        null;
      end;
    end loop;
  end if;
end $$;
