-- ============================================================
-- MIGRAÇÃO 03 — Líderes podem criar e editar pessoas
-- ============================================================
-- Rode este script no SQL Editor do Supabase DEPOIS da migração 02.
-- Pode rodar mais de uma vez sem erro (idempotente).
--
-- O que muda:
--   • Líder de departamento passa a poder CRIAR e EDITAR pessoas
--     da própria igreja (para montar a equipe do departamento dele).
--   • EXCLUIR pessoa continua sendo só do admin (excluir afeta
--     escalas de todos os departamentos).
-- ============================================================

drop policy if exists "escreve" on pessoas;
drop policy if exists "insere_edita" on pessoas;
drop policy if exists "atualiza" on pessoas;
drop policy if exists "exclui" on pessoas;

create policy "insere_edita" on pessoas for insert to authenticated
  with check (sou_super() or (meu_papel() in ('admin','lider') and igreja_id = minha_igreja()));

create policy "atualiza" on pessoas for update to authenticated
  using (sou_super() or (meu_papel() in ('admin','lider') and igreja_id = minha_igreja()))
  with check (sou_super() or (meu_papel() in ('admin','lider') and igreja_id = minha_igreja()));

create policy "exclui" on pessoas for delete to authenticated
  using (sou_super() or (meu_papel() = 'admin' and igreja_id = minha_igreja()));
