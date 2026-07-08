-- ============================================================
-- MIGRAÇÃO 02 (corrigida) — Multi-igreja, papéis e cadastro.
-- Para quem JÁ rodou o schema.sql anterior + migracao-01.
-- Pode rodar mais de uma vez sem erro (idempotente).
--
-- Papéis:
--   super  → CHAVE MESTRE: admin de TODAS as igrejas
--   admin  → tudo na sua igreja
--   lider  → funções/vínculos/indisponibilidades e itens de escala
--            dos SEUS departamentos; cria/edita escalas
--   membro → somente leitura
--
-- ⚙️ Depois de rodar: em Authentication → Sign In / Up, DESATIVE
--    "Confirm email" (o gate de segurança é a aprovação do admin).
-- ============================================================

-- ✏️✏️✏️ CONFIGURE AQUI ✏️✏️✏️
-- As igrejas (nome + código de convite usado no cadastro do app):
--   principal (recebe TODOS os dados já existentes): 'ICPB PENHA', código 'ICPB'
--   segunda igreja: 'Casa da Rocha', código 'Casa_da_Rocha'
-- O código da igreja principal é usado de novo mais abaixo — este script
-- já está todo consistente com 'ICPB'; se trocar, troque em todo o arquivo.
-- E-mail da CHAVE MESTRE (vira super, admin de todas as igrejas):
--   lucas.assis2002@gmail.com  ← confira se é exatamente o e-mail do seu login

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
  papel text not null default 'membro' check (papel in ('super', 'admin', 'lider', 'membro')),
  aprovado boolean not null default false,
  created_at timestamptz not null default now()
);

-- se a tabela perfis já existia sem o papel 'super', atualiza o check
alter table perfis drop constraint if exists perfis_papel_check;
alter table perfis add constraint perfis_papel_check check (papel in ('super', 'admin', 'lider', 'membro'));

create table if not exists lider_departamentos (
  user_id uuid not null references perfis(user_id) on delete cascade,
  departamento_id uuid not null references departamentos(id) on delete cascade,
  primary key (user_id, departamento_id)
);

insert into igrejas (nome, codigo_convite) values
  ('ICPB PENHA', 'ICPB'),
  ('Casa da Rocha', 'Casa_da_Rocha')
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

-- chave mestre: acesso total a todas as igrejas
create or replace function sou_super() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select papel = 'super' from perfis where user_id = auth.uid() and aprovado), false)
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
alter table pessoas                     add column if not exists igreja_id uuid references igrejas(id) on delete cascade;
alter table departamentos               add column if not exists igreja_id uuid references igrejas(id) on delete cascade;
alter table funcoes                     add column if not exists igreja_id uuid references igrejas(id) on delete cascade;
alter table membro_funcoes              add column if not exists igreja_id uuid references igrejas(id) on delete cascade;
alter table indisponibilidades          add column if not exists igreja_id uuid references igrejas(id) on delete cascade;
alter table indisponibilidades_semanais add column if not exists igreja_id uuid references igrejas(id) on delete cascade;
alter table escalas                     add column if not exists igreja_id uuid references igrejas(id) on delete cascade;
alter table escala_itens                add column if not exists igreja_id uuid references igrejas(id) on delete cascade;

-- dados já existentes → igreja principal ('ICPB')
update pessoas                     set igreja_id = (select id from igrejas where codigo_convite = 'ICPB') where igreja_id is null;
update departamentos               set igreja_id = (select id from igrejas where codigo_convite = 'ICPB') where igreja_id is null;
update funcoes                     set igreja_id = (select id from igrejas where codigo_convite = 'ICPB') where igreja_id is null;
update membro_funcoes              set igreja_id = (select id from igrejas where codigo_convite = 'ICPB') where igreja_id is null;
update indisponibilidades          set igreja_id = (select id from igrejas where codigo_convite = 'ICPB') where igreja_id is null;
update indisponibilidades_semanais set igreja_id = (select id from igrejas where codigo_convite = 'ICPB') where igreja_id is null;
update escalas                     set igreja_id = (select id from igrejas where codigo_convite = 'ICPB') where igreja_id is null;
update escala_itens                set igreja_id = (select id from igrejas where codigo_convite = 'ICPB') where igreja_id is null;

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

-- ---------- 4) Usuários existentes viram admins aprovados da igreja principal ----------
insert into perfis (user_id, igreja_id, nome, email, papel, aprovado)
select
  u.id,
  (select id from igrejas where codigo_convite = 'ICPB'),
  coalesce(u.raw_user_meta_data ->> 'nome', split_part(u.email, '@', 1)),
  coalesce(u.email, ''),
  'admin',
  true
from auth.users u
on conflict (user_id) do nothing;

-- ---------- 5) CHAVE MESTRE ----------
-- ✏️ confira o e-mail (é o do seu login no app/Supabase)
update perfis set papel = 'super', aprovado = true
where email = 'lucas.assis2002@gmail.com';

-- ---------- 6) RLS ----------
alter table igrejas enable row level security;
alter table perfis enable row level security;
alter table lider_departamentos enable row level security;

-- remove políticas antigas (inclusive de execuções anteriores desta migração)
drop policy if exists "autenticados" on pessoas;
drop policy if exists "autenticados" on departamentos;
drop policy if exists "autenticados" on funcoes;
drop policy if exists "autenticados" on membro_funcoes;
drop policy if exists "autenticados" on indisponibilidades;
drop policy if exists "autenticados" on indisponibilidades_semanais;
drop policy if exists "autenticados" on escalas;
drop policy if exists "autenticados" on escala_itens;
drop policy if exists "ver_minha_igreja" on igrejas;
drop policy if exists "ver_perfis" on perfis;
drop policy if exists "admin_edita_perfis" on perfis;
drop policy if exists "admin_remove_perfis" on perfis;
drop policy if exists "ver_lideres" on lider_departamentos;
drop policy if exists "admin_gerencia_lideres" on lider_departamentos;
drop policy if exists "le_igreja" on pessoas;
drop policy if exists "le_igreja" on departamentos;
drop policy if exists "le_igreja" on funcoes;
drop policy if exists "le_igreja" on membro_funcoes;
drop policy if exists "le_igreja" on indisponibilidades;
drop policy if exists "le_igreja" on indisponibilidades_semanais;
drop policy if exists "le_igreja" on escalas;
drop policy if exists "le_igreja" on escala_itens;
drop policy if exists "escreve" on pessoas;
drop policy if exists "escreve" on departamentos;
drop policy if exists "escreve" on funcoes;
drop policy if exists "escreve" on membro_funcoes;
drop policy if exists "escreve" on indisponibilidades;
drop policy if exists "escreve" on indisponibilidades_semanais;
drop policy if exists "escreve" on escala_itens;
drop policy if exists "cria" on escalas;
drop policy if exists "edita" on escalas;
drop policy if exists "exclui" on escalas;

-- igrejas: usuário vê a própria; super vê todas
create policy "ver_minha_igreja" on igrejas for select to authenticated
  using (sou_super() or id = minha_igreja());

-- perfis: cada um vê o próprio; admin gerencia os da sua igreja; super, de todas
create policy "ver_perfis" on perfis for select to authenticated
  using (sou_super() or user_id = auth.uid() or (meu_papel() = 'admin' and igreja_id = minha_igreja()));
create policy "admin_edita_perfis" on perfis for update to authenticated
  using (sou_super() or (meu_papel() = 'admin' and igreja_id = minha_igreja()))
  with check (sou_super() or igreja_id = minha_igreja());
create policy "admin_remove_perfis" on perfis for delete to authenticated
  using ((sou_super() or (meu_papel() = 'admin' and igreja_id = minha_igreja())) and user_id <> auth.uid());

-- lider_departamentos
create policy "ver_lideres" on lider_departamentos for select to authenticated
  using (sou_super() or (sou_aprovado() and exists (
    select 1 from perfis p where p.user_id = lider_departamentos.user_id and p.igreja_id = minha_igreja()
  )));
create policy "admin_gerencia_lideres" on lider_departamentos for all to authenticated
  using (sou_super() or (meu_papel() = 'admin' and exists (
    select 1 from perfis p where p.user_id = lider_departamentos.user_id and p.igreja_id = minha_igreja()
  )))
  with check (sou_super() or (meu_papel() = 'admin' and exists (
    select 1 from perfis p where p.user_id = lider_departamentos.user_id and p.igreja_id = minha_igreja()
  )));

-- ---- tabelas de dados: leitura ----
create policy "le_igreja" on pessoas for select to authenticated using (sou_super() or (sou_aprovado() and igreja_id = minha_igreja()));
create policy "le_igreja" on departamentos for select to authenticated using (sou_super() or (sou_aprovado() and igreja_id = minha_igreja()));
create policy "le_igreja" on funcoes for select to authenticated using (sou_super() or (sou_aprovado() and igreja_id = minha_igreja()));
create policy "le_igreja" on membro_funcoes for select to authenticated using (sou_super() or (sou_aprovado() and igreja_id = minha_igreja()));
create policy "le_igreja" on indisponibilidades for select to authenticated using (sou_super() or (sou_aprovado() and igreja_id = minha_igreja()));
create policy "le_igreja" on indisponibilidades_semanais for select to authenticated using (sou_super() or (sou_aprovado() and igreja_id = minha_igreja()));
create policy "le_igreja" on escalas for select to authenticated using (sou_super() or (sou_aprovado() and igreja_id = minha_igreja()));
create policy "le_igreja" on escala_itens for select to authenticated using (sou_super() or (sou_aprovado() and igreja_id = minha_igreja()));

-- ---- escrita ----
create policy "escreve" on pessoas for all to authenticated
  using (sou_super() or (meu_papel() = 'admin' and igreja_id = minha_igreja()))
  with check (sou_super() or (meu_papel() = 'admin' and igreja_id = minha_igreja()));
create policy "escreve" on departamentos for all to authenticated
  using (sou_super() or (meu_papel() = 'admin' and igreja_id = minha_igreja()))
  with check (sou_super() or (meu_papel() = 'admin' and igreja_id = minha_igreja()));
create policy "escreve" on funcoes for all to authenticated
  using (sou_super() or (igreja_id = minha_igreja() and (meu_papel() = 'admin' or (meu_papel() = 'lider' and lidero_departamento(departamento_id)))))
  with check (sou_super() or (igreja_id = minha_igreja() and (meu_papel() = 'admin' or (meu_papel() = 'lider' and lidero_departamento(departamento_id)))));
create policy "escreve" on membro_funcoes for all to authenticated
  using (sou_super() or (igreja_id = minha_igreja() and (meu_papel() = 'admin' or (meu_papel() = 'lider' and lidero_departamento((select departamento_id from funcoes f where f.id = funcao_id))))))
  with check (sou_super() or (igreja_id = minha_igreja() and (meu_papel() = 'admin' or (meu_papel() = 'lider' and lidero_departamento((select departamento_id from funcoes f where f.id = funcao_id))))));
create policy "escreve" on indisponibilidades for all to authenticated
  using (sou_super() or (igreja_id = minha_igreja() and meu_papel() in ('admin', 'lider')))
  with check (sou_super() or (igreja_id = minha_igreja() and meu_papel() in ('admin', 'lider')));
create policy "escreve" on indisponibilidades_semanais for all to authenticated
  using (sou_super() or (igreja_id = minha_igreja() and meu_papel() in ('admin', 'lider')))
  with check (sou_super() or (igreja_id = minha_igreja() and meu_papel() in ('admin', 'lider')));
create policy "cria" on escalas for insert to authenticated
  with check (sou_super() or (igreja_id = minha_igreja() and meu_papel() in ('admin', 'lider')));
create policy "edita" on escalas for update to authenticated
  using (sou_super() or (igreja_id = minha_igreja() and meu_papel() in ('admin', 'lider')))
  with check (sou_super() or (igreja_id = minha_igreja() and meu_papel() in ('admin', 'lider')));
create policy "exclui" on escalas for delete to authenticated
  using (sou_super() or (igreja_id = minha_igreja() and meu_papel() = 'admin'));
create policy "escreve" on escala_itens for all to authenticated
  using (sou_super() or (igreja_id = minha_igreja() and (meu_papel() = 'admin' or (meu_papel() = 'lider' and lidero_departamento((select departamento_id from funcoes f where f.id = funcao_id))))))
  with check (sou_super() or (igreja_id = minha_igreja() and (meu_papel() = 'admin' or (meu_papel() = 'lider' and lidero_departamento((select departamento_id from funcoes f where f.id = funcao_id))))));

-- ------------------------------------------------------------
-- Para promover o admin local de uma igreja depois que a pessoa
-- se cadastrar no app com o código dela, rode:
--
-- update perfis set papel = 'admin', aprovado = true
-- where email = 'email-da-pessoa@exemplo.com';
-- ------------------------------------------------------------
