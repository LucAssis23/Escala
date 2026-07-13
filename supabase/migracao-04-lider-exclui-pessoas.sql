-- ============================================================
-- MIGRAÇÃO 04 — Líderes também podem excluir pessoas
-- ============================================================
-- Rode este script no SQL Editor do Supabase (no MESMO projeto
-- onde o app guarda os dados — confira o nome do projeto no topo).
-- Pode rodar mais de uma vez sem erro (idempotente).
--
-- O que muda: a exclusão de pessoas, antes restrita ao admin,
-- passa a ser permitida também para líderes de departamento.
-- ============================================================

-- Funções auxiliares (mesmas da migração 02; recriadas aqui para o
-- script funcionar sozinho caso o banco não as tenha).
create or replace function minha_igreja() returns uuid
language sql stable security definer set search_path = public as $$
  select igreja_id from perfis where user_id = auth.uid()
$$;

create or replace function meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from perfis where user_id = auth.uid() and aprovado
$$;

create or replace function sou_super() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select papel = 'super' from perfis where user_id = auth.uid() and aprovado), false)
$$;

-- A mudança em si: excluir pessoas liberado para admin E líder.
drop policy if exists "exclui" on pessoas;

create policy "exclui" on pessoas for delete to authenticated
  using (sou_super() or (meu_papel() in ('admin','lider') and igreja_id = minha_igreja()));
