-- ============================================================
-- MIGRAÇÃO 02 — Multi-igreja, papéis e cadastro com aprovação.
-- Para quem JÁ rodou o schema.sql anterior + migracao-01.
--
-- O que faz:
--  1. Cria igrejas (2 iniciais), perfis de usuário e líderes de departamento.
--  2. Adiciona igreja_id em todas as tabelas (dados atuais vão para a Igreja 1).
--  3. Usuários já existentes viram ADMIN da Igreja 1, aprovados.
--  4. Novas políticas RLS por igreja e papel:
--       admin  → tudo na sua igreja
--       lider  → funções/vínculos/indisponibilidades e itens de escala
--                dos SEUS departamentos; cria/edita escalas
--       membro → somente leitura
--  5. Função entrar_na_igreja(codigo, nome) usada pelo cadastro do app.
--
-- ⚙️ Depois de rodar: em Authentication → Sign In / Up, DESATIVE
--    "Confirm email" (o gate de segurança é a aprovação do admin).
-- ✏️ Ajuste os nomes/códigos das igrejas no bloco de seed abaixo.
-- ============================================================

-- ---------- 1) Tabelas novas ----------
create table if not exists igrejas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo_convite text not null unique
);

create table if not exists perfis (
  user_id uuid primary key references auth.users(id) on delete cascade,
  igreja_id uuid not null references igrejas(id) on delete cascade,
  nome text not null,
  email text not null default '',
  papel text not null default 'membro' check (papel in ('admin', 'lider', 'membro')),
  aprovado boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists lider_departamentos (
  user_id uuid not null references perfis(user_id) on delete cascade,
  departamento_id uuid not null references departamentos(id) on delete cascade,
  primary key (user_id, departamento_id)
);

-- ✏️ AS DUAS IGREJAS INICIAIS (edite nome e código à vontade)
insert into igrejas (nome, codigo_convite) values
  ('Igreja 1', 'IGREJA1'),
  ('Igreja 2', 'IGREJA2')
on conflict (codigo_convite) do nothing;

-- ---------- 2) Funções auxiliares (security definer evita recursão de RLS) ----------
create or replace function minha_igreja() returns uuid
language sql stable security definer set search_path = public as $$
  select igreja_id from perfis where user_id = auth.uid()
$$;

create or replace function sou_aprovado() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select aprovado from perfis where user_id = auth.uid()), false)
$$;

-- papel só vale depois de aprovado
create or replace function meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from perfis where user_id = auth.uid() and aprovado
$$;

create or replace function lidero_departamento(dep uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from lider_departamentos
    where user_id = auth.uid() and departamento_id = dep
  )
$$;

-- Cadastro: vincula o usuário recém-criado à igreja pelo código de convite
create or replace function entrar_na_igreja(codigo text, nome_usuario text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_igreja uuid;
begin
  select id into v_igreja from igrejas where upper(codigo_convite) = upper(trim(codigo));
  if v_igreja is null then
    raise exception 'Código de igreja inválido';
  end if;
  insert into perfis (user_id, igreja_id, nome, email, papel, aprovado)
  values (
    auth.uid(), v_igreja, nome_usuario,
    coalesce((select email from auth.users where id = auth.uid()), ''),
    'membro', false
  )
  on conflict (user_id) do nothing;
end $$;

grant execute on function entrar_na_igreja(text, text) to authenticated;

-- ---------- 3) igreja_id em todas as tabelas de dados ----------
alter table pessoas                    add column if not exists igreja_id uuid references igrejas(id) on delete cascade;
alter table departamentos              add column if not exists igreja_id uuid references igrejas(id) on delete cascade;
alter table funcoes                    add column if not exists igreja_id uuid references igrejas(id) on delete cascade;
alter table membro_funcoes             add column if not exists igreja_id uuid references igrejas(id) on delete cascade;
alter table indisponibilidades         add column if not exists igreja_id uuid references igrejas(id) on delete cascade;
alter table indisponibilidades_semanais add column if not exists igreja_id uuid references igrejas(id) on delete cascade;
alter table escalas                    add column if not exists igreja_id uuid references igrejas(id) on delete cascade;
alter table escala_itens               add column if not exists igreja_id uuid references igrejas(id) on delete cascade;

-- dados existentes → Igreja 1
update pessoas                     set igreja_id = (select id from igrejas where codigo_convite = 'IGREJA1') where igreja_id is null;
update departamentos               set igreja_id = (select id from igrejas where codigo_convite = 'IGREJA1') where igreja_id is null;
update funcoes                     set igreja_id = (select id from igrejas where codigo_convite = 'IGREJA1') where igreja_id is null;
update membro_funcoes              set igreja_id = (select id from igrejas where codigo_convite = 'IGREJA1') where igreja_id is null;
update indisponibilidades          set igreja_id = (select id from igrejas where codigo_convite = 'IGREJA1') where igreja_id is null;
update indisponibilidades_semanais set igreja_id = (select id from igrejas where codigo_convite = 'IGREJA1') where igreja_id is null;
update escalas                     set igreja_id = (select id from igrejas where codigo_convite = 'IGREJA1') where igreja_id is null;
update escala_itens                set igreja_id = (select id from igrejas where codigo_convite = 'IGREJA1') where igreja_id is null;

-- obrigatório + preenchido automaticamente com a igreja do usuário logado
alter table pessoas                     alter column igreja_id set not null, alter column igreja_id set default minha_igreja();
alter table departamentos               alter column igreja_id set not null, alter column igreja_id set default minha_igreja();
alter table funcoes                     alter column igreja_id set not null, alter column igreja_id set default minha_igreja();
alter table membro_funcoes              alter column igreja_id set not null, alter column igreja_id set default minha_igreja();
alter table indisponibilidades          alter column igreja_id set not null, alter column igreja_id set default minha_igreja();
alter table indisponibilidades_semanais alter column igreja_id set not null, alter column igreja_id set default minha_igreja();
alter table escalas                     alter column igreja_id set not null, alter column igreja_id set default minha_igreja();
alter table escala_itens                alter column igreja_id set not null, alter column igreja_id set default minha_igreja();

create index if not exists idx_pessoas_igreja on pessoas(igreja_id);
create index if not exists idx_departamentos_igreja on departamentos(igreja_id);
create index if not exists idx_funcoes_igreja on funcoes(igreja_id);
create index if not exists idx_escalas_igreja on escalas(igreja_id);
create index if not exists idx_escala_itens_igreja on escala_itens(igreja_id);
create index if not exists idx_perfis_igreja on perfis(igreja_id);

-- ---------- 4) Usuários existentes viram admins aprovados da Igreja 1 ----------
insert into perfis (user_id, igreja_id, nome, email, papel, aprovado)
select
  u.id,
  (select id from igrejas where codigo_convite = 'IGREJA1'),
  coalesce(u.raw_user_meta_data ->> 'nome', split_part(u.email, '@', 1)),
  coalesce(u.email, ''),
  'admin',
  true
from auth.users u
on conflict (user_id) do nothing;

-- ---------- 5) RLS ----------
alter table igrejas enable row level security;
alter table perfis enable row level security;
alter table lider_departamentos enable row level security;

-- remove as políticas antigas ("autenticados" liberava tudo)
drop policy if exists "autenticados" on pessoas;
drop policy if exists "autenticados" on departamentos;
drop policy if exists "autenticados" on funcoes;
drop policy if exists "autenticados" on membro_funcoes;
drop policy if exists "autenticados" on indisponibilidades;
drop policy if exists "autenticados" on indisponibilidades_semanais;
drop policy if exists "autenticados" on escalas;
drop policy if exists "autenticados" on escala_itens;

-- igrejas: o usuário vê apenas a própria (mesmo antes de aprovado, para exibir o nome)
create policy "ver_minha_igreja" on igrejas for select to authenticated
  using (id = minha_igreja());

-- perfis: cada um vê o próprio; admin vê e gerencia os da sua igreja
create policy "ver_perfis" on perfis for select to authenticated
  using (user_id = auth.uid() or (meu_papel() = 'admin' and igreja_id = minha_igreja()));
create policy "admin_edita_perfis" on perfis for update to authenticated
  using (meu_papel() = 'admin' and igreja_id = minha_igreja())
  with check (igreja_id = minha_igreja());
create policy "admin_remove_perfis" on perfis for delete to authenticated
  using (meu_papel() = 'admin' and igreja_id = minha_igreja() and user_id <> auth.uid());

-- lider_departamentos: leitura para membros aprovados da igreja; escrita só admin
create policy "ver_lideres" on lider_departamentos for select to authenticated
  using (sou_aprovado() and exists (
    select 1 from perfis p where p.user_id = lider_departamentos.user_id and p.igreja_id = minha_igreja()
  ));
create policy "admin_gerencia_lideres" on lider_departamentos for all to authenticated
  using (meu_papel() = 'admin' and exists (
    select 1 from perfis p where p.user_id = lider_departamentos.user_id and p.igreja_id = minha_igreja()
  ))
  with check (meu_papel() = 'admin' and exists (
    select 1 from perfis p where p.user_id = lider_departamentos.user_id and p.igreja_id = minha_igreja()
  ));

-- ---- tabelas de dados: leitura para todo membro aprovado da igreja ----
create policy "le_igreja" on pessoas for select to authenticated using (sou_aprovado() and igreja_id = minha_igreja());
create policy "le_igreja" on departamentos for select to authenticated using (sou_aprovado() and igreja_id = minha_igreja());
create policy "le_igreja" on funcoes for select to authenticated using (sou_aprovado() and igreja_id = minha_igreja());
create policy "le_igreja" on membro_funcoes for select to authenticated using (sou_aprovado() and igreja_id = minha_igreja());
create policy "le_igreja" on indisponibilidades for select to authenticated using (sou_aprovado() and igreja_id = minha_igreja());
create policy "le_igreja" on indisponibilidades_semanais for select to authenticated using (sou_aprovado() and igreja_id = minha_igreja());
create policy "le_igreja" on escalas for select to authenticated using (sou_aprovado() and igreja_id = minha_igreja());
create policy "le_igreja" on escala_itens for select to authenticated using (sou_aprovado() and igreja_id = minha_igreja());

-- ---- escrita ----
-- pessoas e departamentos: só admin
create policy "escreve" on pessoas for all to authenticated
  using (meu_papel() = 'admin' and igreja_id = minha_igreja())
  with check (meu_papel() = 'admin' and igreja_id = minha_igreja());
create policy "escreve" on departamentos for all to authenticated
  using (meu_papel() = 'admin' and igreja_id = minha_igreja())
  with check (meu_papel() = 'admin' and igreja_id = minha_igreja());

-- funções: admin ou líder do departamento
create policy "escreve" on funcoes for all to authenticated
  using (igreja_id = minha_igreja() and (meu_papel() = 'admin' or (meu_papel() = 'lider' and lidero_departamento(departamento_id))))
  with check (igreja_id = minha_igreja() and (meu_papel() = 'admin' or (meu_papel() = 'lider' and lidero_departamento(departamento_id))));

-- vínculos pessoa↔função: admin ou líder do departamento da função
create policy "escreve" on membro_funcoes for all to authenticated
  using (igreja_id = minha_igreja() and (meu_papel() = 'admin' or (meu_papel() = 'lider' and lidero_departamento((select departamento_id from funcoes f where f.id = funcao_id)))))
  with check (igreja_id = minha_igreja() and (meu_papel() = 'admin' or (meu_papel() = 'lider' and lidero_departamento((select departamento_id from funcoes f where f.id = funcao_id)))));

-- indisponibilidades: admin ou qualquer líder
create policy "escreve" on indisponibilidades for all to authenticated
  using (igreja_id = minha_igreja() and meu_papel() in ('admin', 'lider'))
  with check (igreja_id = minha_igreja() and meu_papel() in ('admin', 'lider'));
create policy "escreve" on indisponibilidades_semanais for all to authenticated
  using (igreja_id = minha_igreja() and meu_papel() in ('admin', 'lider'))
  with check (igreja_id = minha_igreja() and meu_papel() in ('admin', 'lider'));

-- escalas: admin ou líder criam/editam; excluir só admin
create policy "cria" on escalas for insert to authenticated
  with check (igreja_id = minha_igreja() and meu_papel() in ('admin', 'lider'));
create policy "edita" on escalas for update to authenticated
  using (igreja_id = minha_igreja() and meu_papel() in ('admin', 'lider'))
  with check (igreja_id = minha_igreja() and meu_papel() in ('admin', 'lider'));
create policy "exclui" on escalas for delete to authenticated
  using (igreja_id = minha_igreja() and meu_papel() = 'admin');

-- itens de escala: admin ou líder DO departamento da função do item
create policy "escreve" on escala_itens for all to authenticated
  using (igreja_id = minha_igreja() and (meu_papel() = 'admin' or (meu_papel() = 'lider' and lidero_departamento((select departamento_id from funcoes f where f.id = funcao_id)))))
  with check (igreja_id = minha_igreja() and (meu_papel() = 'admin' or (meu_papel() = 'lider' and lidero_departamento((select departamento_id from funcoes f where f.id = funcao_id)))));

-- ------------------------------------------------------------
-- Para promover o primeiro admin da Igreja 2 depois que a pessoa
-- se cadastrar no app com o código IGREJA2, rode:
--
-- update perfis set papel = 'admin', aprovado = true
-- where email = 'email-da-pessoa@exemplo.com';
-- ------------------------------------------------------------
