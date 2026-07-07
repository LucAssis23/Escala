-- ============================================================
-- Escala da Igreja — esquema do banco (rodar no SQL Editor do Supabase)
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists pessoas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null default '',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists departamentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor text not null default '#6366f1'
);

create table if not exists funcoes (
  id uuid primary key default gen_random_uuid(),
  departamento_id uuid not null references departamentos(id) on delete cascade,
  nome text not null
);

-- muitos-para-muitos: uma pessoa pode ter várias funções em vários departamentos
create table if not exists membro_funcoes (
  pessoa_id uuid not null references pessoas(id) on delete cascade,
  funcao_id uuid not null references funcoes(id) on delete cascade,
  primary key (pessoa_id, funcao_id)
);

create table if not exists indisponibilidades (
  pessoa_id uuid not null references pessoas(id) on delete cascade,
  data date not null,
  primary key (pessoa_id, data)
);

create table if not exists escalas (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  titulo text not null
);

create table if not exists escala_itens (
  id uuid primary key default gen_random_uuid(),
  escala_id uuid not null references escalas(id) on delete cascade,
  funcao_id uuid not null references funcoes(id) on delete cascade,
  -- se a pessoa for excluída, a vaga volta a ficar "em aberto"
  pessoa_id uuid references pessoas(id) on delete set null
);

create index if not exists idx_funcoes_departamento on funcoes(departamento_id);
create index if not exists idx_escala_itens_escala on escala_itens(escala_id);
create index if not exists idx_escala_itens_pessoa on escala_itens(pessoa_id);
create index if not exists idx_escalas_data on escalas(data);

-- ------------------------------------------------------------
-- RLS: políticas permissivas (app sem login, chave anon pública).
-- Quando quiser adicionar autenticação, troque `using (true)` por
-- `using (auth.role() = 'authenticated')` e ative o login no app.
-- ------------------------------------------------------------
alter table pessoas enable row level security;
alter table departamentos enable row level security;
alter table funcoes enable row level security;
alter table membro_funcoes enable row level security;
alter table indisponibilidades enable row level security;
alter table escalas enable row level security;
alter table escala_itens enable row level security;

create policy "acesso_total" on pessoas for all using (true) with check (true);
create policy "acesso_total" on departamentos for all using (true) with check (true);
create policy "acesso_total" on funcoes for all using (true) with check (true);
create policy "acesso_total" on membro_funcoes for all using (true) with check (true);
create policy "acesso_total" on indisponibilidades for all using (true) with check (true);
create policy "acesso_total" on escalas for all using (true) with check (true);
create policy "acesso_total" on escala_itens for all using (true) with check (true);
