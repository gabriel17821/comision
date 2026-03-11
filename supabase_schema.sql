-- Tabla de Vendedores
create table public.vendors (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de Clientes
create table public.clients (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla de Liquidaciones (Settlements)
create table public.settlements (
  id uuid primary key, -- Usamos el crypto.randomUUID() del frontend
  vendedor text not null,
  porcentaje numeric not null,
  facturas jsonb not null, -- Guardamos el arreglo completo de facturas como JSON
  total_vendido numeric not null,
  comision numeric not null,
  fecha timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Configurar Políticas de Seguridad (RLS) abiertas para la fase inicial (simplificación)
-- IMPORTANTE: En producción esto debería tener Row Level Security más estricto
alter table public.vendors enable row level security;
alter table public.clients enable row level security;
alter table public.settlements enable row level security;

create policy "Acceso público lectura/escritura a vendors" on public.vendors for all using (true) with check (true);
create policy "Acceso público lectura/escritura a clients" on public.clients for all using (true) with check (true);
create policy "Acceso público lectura/escritura a settlements" on public.settlements for all using (true) with check (true);
