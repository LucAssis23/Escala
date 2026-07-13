-- ============================================================
-- Escala da Igreja — esquema completo (instalação NOVA).
-- Rodar no SQL Editor do Supabase.
--
-- Se o seu banco já existia antes do multi-igreja, NÃO rode este
-- arquivo: use as migrações (migracao-01 e migracao-02).
--
-- Papéis: super (chave mestre: admin de TODAS as igrejas) ·
--         admin (tudo na sua igreja) · lider (seus departamentos) ·
--         membro (somente leitura). Cadastro no app usa o código
--         de convite da igreja e aguarda aprovação do admin.
--
-- ⚙️ Depois de rodar: em Authentication → Sign In / Up, DESATIVE
--    "Confirm email". Para o primeiro admin: cadastre-se no app e
--    rode o UPDATE indicado no fim deste arquivo.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- igrejas e usuários ----------
create table if not exists igrejas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  codigo_convite text not null unique
);

-- ✏️ AS IGREJAS INICIAIS (edite nome e código à vontade)
insert into igrejas (nome, codigo_convite) values
  ('Igreja 1', 'IGREJA1'),
  ('Igreja 2', 'IGREJA2')
on conflict (codigo_convite) do nothing;

create table if not exists perfis (
  user_id uuid primary key references auth.users(id) on delete cascade,
  igreja_id uuid not null references igrejas(id) on delete cascade,
  nome text not null,
  email text not null default '',
  papel text not null default 'membro' check (papel in ('super', 'admin', 'lider', 'membro')),
  aprovado boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- funções auxiliares (security definer evita recursão de RLS) ----------
create or replace function minha_igreja() returns uuid
language sql stable security definer set search_path = public as $$
  select igreja_id from perfis where user_id = auth.uid()
$$;

create or replace function sou_aprovado() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select aprovado from perfis where user_id = auth.uid()), false)
$$;

create or replace function meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from perfis where user_id = auth.uid() and aprovado
$$;

-- chave mestre: acesso total a todas as igrejas
create or replace function sou_super() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select papel = 'super' from perfis where user_id = auth.uid() and aprovado), false)
$$;

-- ---------- dados ----------
create table if not exists pessoas (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid not null references igrejas(id) on delete cascade default minha_igreja(),
  nome text not null,
  telefone text not null default '',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists departamentos (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid not null references igrejas(id) on delete cascade default minha_igreja(),
  nome text not null,
  cor text not null default '#6366f1'
);

create table if not exists funcoes (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid not null references igrejas(id) on delete cascade default minha_igreja(),
  departamento_id uuid not null references departamentos(id) on delete cascade,
  nome text not null
);

create table if not exists lider_departamentos (
  user_id uuid not null references perfis(user_id) on delete cascade,
  departamento_id uuid not null references departamentos(id) on delete cascade,
  primary key (user_id, departamento_id)
);

create or replace function lidero_departamento(dep uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from lider_departamentos
    where user_id = auth.uid() and departamento_id = dep
  )
$$;

create table if not exists membro_funcoes (
  igreja_id uuid not null references igrejas(id) on delete cascade default minha_igreja(),
  pessoa_id uuid not null references pessoas(id) on delete cascade,
  funcao_id uuid not null references funcoes(id) on delete cascade,
  primary key (pessoa_id, funcao_id)
);

create table if not exists indisponibilidades (
  igreja_id uuid not null references igrejas(id) on delete cascade default minha_igreja(),
  pessoa_id uuid not null references pessoas(id) on delete cascade,
  data date not null,
  primary key (pessoa_id, data)
);

create table if not exists indisponibilidades_semanais (
  igreja_id uuid not null references igrejas(id) on delete cascade default minha_igreja(),
  pessoa_id uuid not null references pessoas(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  primary key (pessoa_id, dia_semana)
);

create table if not exists escalas (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid not null references igrejas(id) on delete cascade default minha_igreja(),
  data date not null,
  titulo text not null
);

create table if not exists escala_itens (
  id uuid primary key default gen_random_uuid(),
  igreja_id uuid not null references igrejas(id) on delete cascade default minha_igreja(),
  escala_id uuid not null references escalas(id) on delete cascade,
  funcao_id uuid not null references funcoes(id) on delete cascade,
  pessoa_id uuid references pessoas(id) on delete set null
);

create index if not exists idx_funcoes_departamento on funcoes(departamento_id);
create index if not exists idx_escala_itens_escala on escala_itens(escala_id);
create index if not exists idx_escala_itens_pessoa on escala_itens(pessoa_id);
create index if not exists idx_escalas_data on escalas(data);
create index if not exists idx_pessoas_igreja on pessoas(igreja_id);
create index if not exists idx_departamentos_igreja on departamentos(igreja_id);
create index if not exists idx_funcoes_igreja on funcoes(igreja_id);
create index if not exists idx_escalas_igreja on escalas(igreja_id);
create index if not exists idx_escala_itens_igreja on escala_itens(igreja_id);
create index if not exists idx_perfis_igreja on perfis(igreja_id);

-- ---------- cadastro pelo app ----------
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

-- ---------- RLS ----------
alter table igrejas enable row level security;
alter table perfis enable row level security;
alter table lider_departamentos enable row level security;
alter table pessoas enable row level security;
alter table departamentos enable row level security;
alter table funcoes enable row level security;
alter table membro_funcoes enable row level security;
alter table indisponibilidades enable row level security;
alter table indisponibilidades_semanais enable row level security;
alter table escalas enable row level security;
alter table escala_itens enable row level security;

-- igrejas: usuário vê a própria; a chave mestre (super) vê todas
create policy "ver_minha_igreja" on igrejas for select to authenticated
  using (sou_super() or id = minha_igreja());

create policy "ver_perfis" on perfis for select to authenticated
  using (sou_super() or user_id = auth.uid() or (meu_papel() = 'admin' and igreja_id = minha_igreja()));
create policy "admin_edita_perfis" on perfis for update to authenticated
  using (sou_super() or (meu_papel() = 'admin' and igreja_id = minha_igreja()))
  with check (sou_super() or igreja_id = minha_igreja());
create policy "admin_remove_perfis" on perfis for delete to authenticated
  using ((sou_super() or (meu_papel() = 'admin' and igreja_id = minha_igreja())) and user_id <> auth.uid());

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

-- leitura: todo membro aprovado da igreja; super vê todas
create policy "le_igreja" on pessoas for select to authenticated using (sou_super() or (sou_aprovado() and igreja_id = minha_igreja()));
create policy "le_igreja" on departamentos for select to authenticated using (sou_super() or (sou_aprovado() and igreja_id = minha_igreja()));
create policy "le_igreja" on funcoes for select to authenticated using (sou_super() or (sou_aprovado() and igreja_id = minha_igreja()));
create policy "le_igreja" on membro_funcoes for select to authenticated using (sou_super() or (sou_aprovado() and igreja_id = minha_igreja()));
create policy "le_igreja" on indisponibilidades for select to authenticated using (sou_super() or (sou_aprovado() and igreja_id = minha_igreja()));
create policy "le_igreja" on indisponibilidades_semanais for select to authenticated using (sou_super() or (sou_aprovado() and igreja_id = minha_igreja()));
create policy "le_igreja" on escalas for select to authenticated using (sou_super() or (sou_aprovado() and igreja_id = minha_igreja()));
create policy "le_igreja" on escala_itens for select to authenticated using (sou_super() or (sou_aprovado() and igreja_id = minha_igreja()));

-- escrita
-- pessoas: admin e líder criam, editam e excluem
create policy "insere_edita" on pessoas for insert to authenticated
  with check (sou_super() or (meu_papel() in ('admin','lider') and igreja_id = minha_igreja()));
create policy "atualiza" on pessoas for update to authenticated
  using (sou_super() or (meu_papel() in ('admin','lider') and igreja_id = minha_igreja()))
  with check (sou_super() or (meu_papel() in ('admin','lider') and igreja_id = minha_igreja()));
create policy "exclui" on pessoas for delete to authenticated
  using (sou_super() or (meu_papel() in ('admin','lider') and igreja_id = minha_igreja()));
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
-- PRIMEIRO ADMIN de uma igreja: cadastre-se no app com o código dela e rode:
--
-- update perfis set papel = 'admin', aprovado = true
-- where email = 'seu-email@exemplo.com';
--
-- CHAVE MESTRE (admin de TODAS as igrejas): mesma coisa, com papel 'super':
--
-- update perfis set papel = 'super', aprovado = true
-- where email = 'seu-email@exemplo.com';
-- ------------------------------------------------------------
