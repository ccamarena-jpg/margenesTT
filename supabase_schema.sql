-- ============================================================
-- PLATAFORMA DE MÁRGENES - TT AUDIT S.A.C.
-- Schema Supabase/PostgreSQL
-- Fase 1: Base + Proyectos
-- ============================================================

-- Extensiones
create extension if not exists "uuid-ossp";

-- ============================================================
-- USUARIOS / ROLES
-- ============================================================
create table public.usuarios (
  id uuid references auth.users(id) on delete cascade primary key,
  nombre text not null,
  email text not null unique,
  rol text not null check (rol in ('admin','gerencia','operaciones','contabilidad','rrhh')),
  activo boolean default true,
  created_at timestamptz default now()
);

alter table public.usuarios enable row level security;

create policy "usuarios: lectura propia" on public.usuarios
  for select using (auth.uid() = id);

create policy "usuarios: admin lee todos" on public.usuarios
  for select using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol in ('admin','gerencia'))
  );

-- ============================================================
-- PROYECTOS
-- ============================================================
create table public.proyectos (
  id uuid default uuid_generate_v4() primary key,
  nombre text not null,
  cliente text not null,
  ejecutivo text not null,
  monto_contratado numeric(12,2) not null default 0,
  nro_orden_compra text,
  fecha_inicio date,
  fecha_fin date,
  estado text not null default 'activo' check (estado in ('activo','cerrado','suspendido')),
  requiere_operaciones boolean default false,
  creado_por uuid references public.usuarios(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.proyectos enable row level security;

create policy "proyectos: todos leen" on public.proyectos
  for select using (auth.uid() in (select id from public.usuarios where activo = true));

create policy "proyectos: admin y gerencia crean" on public.proyectos
  for insert with check (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol in ('admin','gerencia'))
  );

create policy "proyectos: admin y gerencia editan" on public.proyectos
  for update using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol in ('admin','gerencia'))
  );

-- ============================================================
-- FACTURAS DEL PROYECTO (TT Audit → Cliente)
-- ============================================================
create table public.facturas_proyecto (
  id uuid default uuid_generate_v4() primary key,
  proyecto_id uuid references public.proyectos(id) on delete cascade,
  nro_factura_tt text not null,
  fecha_factura date not null,
  fecha_estimada_pago date,
  monto numeric(12,2) not null,
  estado_cobro text default 'pendiente' check (estado_cobro in ('pendiente','cobrado','vencido')),
  created_at timestamptz default now()
);

alter table public.facturas_proyecto enable row level security;

create policy "facturas_proyecto: todos leen" on public.facturas_proyecto
  for select using (auth.uid() in (select id from public.usuarios where activo = true));

create policy "facturas_proyecto: admin y gerencia gestionan" on public.facturas_proyecto
  for all using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol in ('admin','gerencia'))
  );

-- ============================================================
-- GASTOS (todos los tipos de operaciones)
-- ============================================================
create table public.gastos (
  id uuid default uuid_generate_v4() primary key,
  proyecto_id uuid references public.proyectos(id),
  tipo text not null check (tipo in ('caja_chica','reembolsable','movilidad','proyectado')),
  scope_asignacion text not null default 'proyecto' check (scope_asignacion in ('proyecto','operaciones','todos')),
  -- datos del gasto
  descripcion text not null,
  concepto text,
  monto_proyectado numeric(12,2),
  monto_real numeric(12,2),
  fecha_gasto date,
  -- documento contable (null para movilidad)
  tipo_comprobante text check (tipo_comprobante in ('factura','boleta','rxh','ticket', null)),
  nro_serie text,
  nro_comprobante text,
  ruc_proveedor text,
  razon_social_proveedor text,
  base_imponible numeric(12,2),
  igv numeric(12,2),
  monto_exonerado numeric(12,2),
  -- movilidad
  motivo_movilidad text,
  destino text,
  -- estado del flujo
  estado text not null default 'borrador' check (estado in (
    'borrador',
    'pendiente_aprobacion',
    'aprobado_proyectado',
    'en_liquidacion',
    'liquidado',
    'rechazado',
    'pendiente_reaprobacion'
  )),
  -- trazabilidad
  responsable text not null, -- Roxana o Edinson
  cargado_por uuid references public.usuarios(id),
  aprobado_por uuid references public.usuarios(id),
  fecha_aprobacion timestamptz,
  motivo_rechazo text,
  -- sustento adjunto (URL de Supabase Storage)
  sustento_url text,
  -- periodo
  periodo text, -- ej: '2026-01'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.gastos enable row level security;

create policy "gastos: todos leen" on public.gastos
  for select using (auth.uid() in (select id from public.usuarios where activo = true));

create policy "gastos: operaciones y admin insertan" on public.gastos
  for insert with check (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol in ('admin','gerencia','operaciones'))
  );

create policy "gastos: operaciones editan borradores propios" on public.gastos
  for update using (
    cargado_por = auth.uid() and estado in ('borrador','en_liquidacion')
    or exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol in ('admin','gerencia'))
  );

-- ============================================================
-- PROVEEDORES (directorio compartido)
-- ============================================================
create table public.proveedores (
  id uuid default uuid_generate_v4() primary key,
  ruc text unique not null,
  razon_social text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.proveedores enable row level security;

create policy "proveedores: todos leen" on public.proveedores
  for select using (auth.uid() in (select id from public.usuarios where activo = true));

create policy "proveedores: autenticados gestionan" on public.proveedores
  for all using (auth.uid() in (select id from public.usuarios where activo = true));

-- MIGRACIÓN (si la tabla no existe aún):
-- Ejecutar el bloque completo arriba en Supabase SQL Editor.

-- ============================================================
-- GASTOS FIJOS (contabilidad)
-- ============================================================
create table public.gastos_fijos (
  id uuid default uuid_generate_v4() primary key,
  tipo text not null, -- 'seguro','alquiler','servicio',etc.
  descripcion text not null,
  ruc_proveedor text,
  razon_social_proveedor text,
  nro_comprobante text,
  fecha_contable date,
  monto_sin_igv numeric(12,2) not null,
  igv numeric(12,2),
  scope_asignacion text not null default 'todos' check (scope_asignacion in ('proyecto','operaciones','todos')),
  proyecto_id uuid references public.proyectos(id),
  periodo text not null,
  registrado_por uuid references public.usuarios(id),
  created_at timestamptz default now()
);

alter table public.gastos_fijos enable row level security;

create policy "gastos_fijos: todos leen" on public.gastos_fijos
  for select using (auth.uid() in (select id from public.usuarios where activo = true));

create policy "gastos_fijos: contabilidad y admin gestionan" on public.gastos_fijos
  for all using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol in ('admin','gerencia','contabilidad'))
  );

-- ============================================================
-- PLANILLA GRUPOS
-- ============================================================
create table public.planilla_grupos (
  id uuid default uuid_generate_v4() primary key,
  nombre_grupo text not null,
  responsable text not null,
  tipo text not null check (tipo in ('admin_general','equipo_ejecutivo','operaciones_almacen','conductores')),
  ejecutivo_asignado text,
  costo_total_mes numeric(12,2) not null,
  periodo text not null,
  scope_asignacion text not null default 'todos' check (scope_asignacion in ('proyecto','todos')),
  proyecto_id uuid references public.proyectos(id),
  registrado_por uuid references public.usuarios(id),
  created_at timestamptz default now()
);

-- MIGRACIÓN (ejecutar en Supabase SQL Editor si la tabla ya existe):
-- alter table public.planilla_grupos
--   add column scope_asignacion text not null default 'todos' check (scope_asignacion in ('proyecto','todos')),
--   add column proyecto_id uuid references public.proyectos(id);

alter table public.planilla_grupos enable row level security;

create policy "planilla: todos leen" on public.planilla_grupos
  for select using (auth.uid() in (select id from public.usuarios where activo = true));

create policy "planilla: rrhh y admin gestionan" on public.planilla_grupos
  for all using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol in ('admin','gerencia','rrhh'))
  );

-- ============================================================
-- MOVIMIENTOS UNIDADES MÓVILES (choferes Haitel y Manuel)
-- ============================================================
create table public.movimientos_unidades (
  id uuid default uuid_generate_v4() primary key,
  proyecto_id uuid references public.proyectos(id),
  chofer text not null check (chofer in ('Haitel','Manuel')),
  descripcion text,
  monto numeric(12,2) not null,
  fecha date not null,
  periodo text not null,
  registrado_por uuid references public.usuarios(id),
  created_at timestamptz default now()
);

alter table public.movimientos_unidades enable row level security;

create policy "movimientos: todos leen" on public.movimientos_unidades
  for select using (auth.uid() in (select id from public.usuarios where activo = true));

create policy "movimientos: operaciones y admin gestionan" on public.movimientos_unidades
  for all using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol in ('admin','gerencia','operaciones','contabilidad'))
  );

-- ============================================================
-- FUNCIÓN: updated_at automático
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger proyectos_updated_at before update on public.proyectos
  for each row execute function public.set_updated_at();

create trigger gastos_updated_at before update on public.gastos
  for each row execute function public.set_updated_at();

-- ============================================================
-- FUNCIÓN: crear usuario en public.usuarios al registrarse
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.usuarios (id, nombre, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', new.email),
    new.email,
    coalesce(new.raw_user_meta_data->>'rol', 'operaciones')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- VISTA: margen por proyecto (para dashboard)
-- ============================================================
create or replace view public.v_margen_proyectos as
select
  p.id,
  p.nombre,
  p.cliente,
  p.ejecutivo,
  p.estado,
  p.periodo_label,
  coalesce(sum(fp.monto), 0) as total_facturado,
  coalesce(sum(g.monto_real) filter (where g.estado = 'liquidado'), 0) as total_gastos_variables,
  coalesce(sum(gf.monto_sin_igv) filter (where gf.scope_asignacion = 'proyecto' and gf.proyecto_id = p.id), 0) as total_gastos_fijos,
  coalesce(sum(fp.monto), 0)
    - coalesce(sum(g.monto_real) filter (where g.estado = 'liquidado'), 0)
    - coalesce(sum(gf.monto_sin_igv) filter (where gf.scope_asignacion = 'proyecto' and gf.proyecto_id = p.id), 0)
  as margen_bruto
from public.proyectos p
left join public.facturas_proyecto fp on fp.proyecto_id = p.id
left join public.gastos g on g.proyecto_id = p.id
left join public.gastos_fijos gf on gf.proyecto_id = p.id
group by p.id, p.nombre, p.cliente, p.ejecutivo, p.estado;

-- ============================================================
-- MIGRACIÓN: Módulo Proyectos (billing ledger 18 columnas)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Nuevos campos en proyectos
alter table public.proyectos
  add column if not exists tipo_servicio text,
  add column if not exists responsable_pago text;

-- 2. Nuevos campos en facturas_proyecto
alter table public.facturas_proyecto
  add column if not exists facturacion_concursos numeric(12,2),
  add column if not exists fee_concursos numeric(12,2),
  add column if not exists importe_os numeric(12,2),
  add column if not exists os text,
  add column if not exists he text,
  add column if not exists fecha_vencimiento date,
  add column if not exists fecha_pago date,
  add column if not exists periodo text;

-- 3. Actualizar constraint de estado_cobro (aprobado | pagado)
alter table public.facturas_proyecto
  drop constraint if exists facturas_proyecto_estado_cobro_check;

alter table public.facturas_proyecto
  add constraint facturas_proyecto_estado_cobro_check
  check (estado_cobro in ('aprobado','pagado'));

-- 4. Planilla: scope_asignacion + proyecto_id (si no se ejecutó antes)
alter table public.planilla_grupos
  add column if not exists scope_asignacion text not null default 'todos'
    check (scope_asignacion in ('proyecto','todos')),
  add column if not exists proyecto_id uuid references public.proyectos(id);

-- ============================================================
-- MIGRACIÓN: Directorio de proveedores
-- Ejecutar solo si la tabla proveedores no existe aún
-- ============================================================
-- (la tabla ya está definida arriba; este bloque es referencia)
-- create table if not exists public.proveedores ( ... );
