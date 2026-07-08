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

-- indisponibilidade recorrente por dia da semana (0=domingo … 6=sábado)
create table if not exists indisponibilidades_semanais (
  pessoa_id uuid not null references pessoas(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  primary key (pessoa_id, dia_semana)
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
-- RLS: acesso apenas para usuários logados (Supabase Auth).
-- Crie os acessos da equipe em Authentication → Users → Add user.
-- ------------------------------------------------------------
alter table pessoas enable row level security;
alter table departamentos enable row level security;
alter table funcoes enable row level security;
alter table membro_funcoes enable row level security;
alter table indisponibilidades enable row level security;
alter table indisponibilidades_semanais enable row level security;
alter table escalas enable row level security;
alter table escala_itens enable row level security;

create policy "autenticados" on pessoas for all to authenticated using (true) with check (true);
create policy "autenticados" on departamentos for all to authenticated using (true) with check (true);
create policy "autenticados" on funcoes for all to authenticated using (true) with check (true);
create policy "autenticados" on membro_funcoes for all to authenticated using (true) with check (true);
create policy "autenticados" on indisponibilidades for all to authenticated using (true) with check (true);
create policy "autenticados" on indisponibilidades_semanais for all to authenticated using (true) with check (true);
create policy "autenticados" on escalas for all to authenticated using (true) with check (true);
create policy "autenticados" on escala_itens for all to authenticated using (true) with check (true);
