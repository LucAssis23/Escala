-- ============================================================
-- MIGRAÇÃO 01 — para quem JÁ rodou o schema.sql original.
-- Adiciona: indisponibilidades semanais ("toda quinta") e
-- restringe o acesso aos dados a usuários logados (Supabase Auth).
--
-- ⚠️ ANTES de rodar, crie ao menos um usuário em
--    Authentication → Users → Add user (e-mail + senha),
--    senão ninguém conseguirá entrar no app.
-- ============================================================

-- 1) Indisponibilidade recorrente por dia da semana (0=domingo … 6=sábado)
create table if not exists indisponibilidades_semanais (
  pessoa_id uuid not null references pessoas(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  primary key (pessoa_id, dia_semana)
);
alter table indisponibilidades_semanais enable row level security;

-- 2) Troca as políticas abertas por acesso apenas para usuários autenticados
drop policy if exists "acesso_total" on pessoas;
drop policy if exists "acesso_total" on departamentos;
drop policy if exists "acesso_total" on funcoes;
drop policy if exists "acesso_total" on membro_funcoes;
drop policy if exists "acesso_total" on indisponibilidades;
drop policy if exists "acesso_total" on escalas;
drop policy if exists "acesso_total" on escala_itens;

create policy "autenticados" on pessoas for all to authenticated using (true) with check (true);
create policy "autenticados" on departamentos for all to authenticated using (true) with check (true);
create policy "autenticados" on funcoes for all to authenticated using (true) with check (true);
create policy "autenticados" on membro_funcoes for all to authenticated using (true) with check (true);
create policy "autenticados" on indisponibilidades for all to authenticated using (true) with check (true);
create policy "autenticados" on indisponibilidades_semanais for all to authenticated using (true) with check (true);
create policy "autenticados" on escalas for all to authenticated using (true) with check (true);
create policy "autenticados" on escala_itens for all to authenticated using (true) with check (true);
