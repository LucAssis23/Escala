-- ============================================================
-- MIGRAÇÃO 04 — Líderes também podem excluir pessoas
-- ============================================================
-- Rode este script no SQL Editor do Supabase DEPOIS da migração 03.
-- Pode rodar mais de uma vez sem erro (idempotente).
--
-- O que muda: a exclusão de pessoas, antes restrita ao admin,
-- passa a ser permitida também para líderes de departamento.
-- ============================================================

drop policy if exists "exclui" on pessoas;

create policy "exclui" on pessoas for delete to authenticated
  using (sou_super() or (meu_papel() in ('admin','lider') and igreja_id = minha_igreja()));
