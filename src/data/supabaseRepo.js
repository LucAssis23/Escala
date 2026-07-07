// Implementação do repositório usando Supabase.
// Ativada automaticamente quando VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY existem.
import { createClient } from '@supabase/supabase-js'

export function criarSupabaseRepo(url, anonKey) {
  const sb = createClient(url, anonKey)

  async function q(promise) {
    const { data, error } = await promise
    if (error) throw new Error(error.message)
    return data
  }

  return {
    nome: 'supabase',

    async loadAll() {
      const [pessoas, departamentos, funcoes, membro_funcoes, indisponibilidades, escalas, escala_itens] =
        await Promise.all([
          q(sb.from('pessoas').select('*').order('nome')),
          q(sb.from('departamentos').select('*').order('nome')),
          q(sb.from('funcoes').select('*').order('nome')),
          q(sb.from('membro_funcoes').select('*')),
          q(sb.from('indisponibilidades').select('*')),
          q(sb.from('escalas').select('*').order('data')),
          q(sb.from('escala_itens').select('*')),
        ])
      return { pessoas, departamentos, funcoes, membro_funcoes, indisponibilidades, escalas, escala_itens }
    },

    async createPessoa({ nome, telefone, ativo = true }) {
      return (await q(sb.from('pessoas').insert({ nome, telefone: telefone || '', ativo }).select()))[0]
    },
    async updatePessoa(id, patch) {
      await q(sb.from('pessoas').update(patch).eq('id', id))
    },
    async deletePessoa(id) {
      await q(sb.from('pessoas').delete().eq('id', id))
    },

    async createDepartamento({ nome, cor }) {
      return (await q(sb.from('departamentos').insert({ nome, cor }).select()))[0]
    },
    async updateDepartamento(id, patch) {
      await q(sb.from('departamentos').update(patch).eq('id', id))
    },
    async deleteDepartamento(id) {
      await q(sb.from('departamentos').delete().eq('id', id))
    },

    async createFuncao({ departamento_id, nome }) {
      return (await q(sb.from('funcoes').insert({ departamento_id, nome }).select()))[0]
    },
    async updateFuncao(id, patch) {
      await q(sb.from('funcoes').update(patch).eq('id', id))
    },
    async deleteFuncao(id) {
      await q(sb.from('funcoes').delete().eq('id', id))
    },

    async setMembroFuncoes(pessoa_id, funcaoIds) {
      await q(sb.from('membro_funcoes').delete().eq('pessoa_id', pessoa_id))
      if (funcaoIds.length) {
        await q(sb.from('membro_funcoes').insert(funcaoIds.map((funcao_id) => ({ pessoa_id, funcao_id }))))
      }
    },

    async addIndisponibilidade(pessoa_id, data) {
      await q(sb.from('indisponibilidades').upsert({ pessoa_id, data }))
    },
    async removeIndisponibilidade(pessoa_id, data) {
      await q(sb.from('indisponibilidades').delete().eq('pessoa_id', pessoa_id).eq('data', data))
    },

    async createEscala({ data, titulo }) {
      return (await q(sb.from('escalas').insert({ data, titulo }).select()))[0]
    },
    async updateEscala(id, patch) {
      await q(sb.from('escalas').update(patch).eq('id', id))
    },
    async deleteEscala(id) {
      await q(sb.from('escalas').delete().eq('id', id))
    },

    async addEscalaItem(escala_id, funcao_id) {
      return (await q(sb.from('escala_itens').insert({ escala_id, funcao_id, pessoa_id: null }).select()))[0]
    },
    async removeEscalaItem(id) {
      await q(sb.from('escala_itens').delete().eq('id', id))
    },
    async setEscalaItemPessoa(id, pessoa_id) {
      await q(sb.from('escala_itens').update({ pessoa_id }).eq('id', id))
    },
    async setEscalaItensPessoas(atribuicoes) {
      await Promise.all(
        atribuicoes.map(({ id, pessoa_id }) => q(sb.from('escala_itens').update({ pessoa_id }).eq('id', id)))
      )
    },
  }
}
