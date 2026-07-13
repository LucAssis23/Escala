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

  // Chave mestre (papel "super"): quando ela opera numa igreja que não é a
  // dela, as gravações precisam informar explicitamente a igreja_id (o
  // padrão da coluna é a igreja do próprio usuário logado).
  let igrejaForcada = null

  return {
    nome: 'supabase',

    setIgrejaAtiva(id) {
      igrejaForcada = id || null
    },

    async loadAll() {
      // Perfil do usuário logado (papel, igreja, aprovação) rege o que carregar.
      const { data: sess } = await sb.auth.getSession()
      const uid = sess.session?.user?.id
      let perfil = null
      if (uid) {
        const rows = await q(
          sb.from('perfis').select('*, igreja:igrejas(id, nome, codigo_convite)').eq('user_id', uid)
        )
        perfil = rows[0] || null
      }

      const vazio = {
        pessoas: [], departamentos: [], funcoes: [], membro_funcoes: [],
        indisponibilidades: [], indisponibilidades_semanais: [], escalas: [], escala_itens: [],
        perfis: [], lider_departamentos: [], igrejas: [], perfil,
      }
      // Sem perfil ou aguardando aprovação: o RLS bloqueia tudo mesmo — nem tenta.
      if (!perfil || !perfil.aprovado) return vazio

      // A chave mestre (papel "super") enxerga os dados de TODAS as igrejas
      // aqui — quem restringe à igreja escolhida na tela é o DataContext.
      const [pessoas, departamentos, funcoes, membro_funcoes, indisponibilidades, indisponibilidades_semanais, escalas, escala_itens, perfis, lider_departamentos, igrejas] =
        await Promise.all([
          q(sb.from('pessoas').select('*').order('nome')),
          q(sb.from('departamentos').select('*').order('nome')),
          q(sb.from('funcoes').select('*').order('nome')),
          q(sb.from('membro_funcoes').select('*')),
          q(sb.from('indisponibilidades').select('*')),
          q(sb.from('indisponibilidades_semanais').select('*')),
          q(sb.from('escalas').select('*').order('data')),
          q(sb.from('escala_itens').select('*')),
          q(sb.from('perfis').select('*').order('nome')),
          q(sb.from('lider_departamentos').select('*')),
          q(sb.from('igrejas').select('*').order('nome')),
        ])
      return { pessoas, departamentos, funcoes, membro_funcoes, indisponibilidades, indisponibilidades_semanais, escalas, escala_itens, perfis, lider_departamentos, igrejas, perfil }
    },

    // ---- equipe (só admin; o RLS garante) ----
    async updatePerfil(user_id, patch) {
      await q(sb.from('perfis').update(patch).eq('user_id', user_id))
    },
    async deletePerfil(user_id) {
      await q(sb.from('perfis').delete().eq('user_id', user_id))
    },
    async setLiderDepartamentos(user_id, departamentoIds) {
      await q(sb.from('lider_departamentos').delete().eq('user_id', user_id))
      if (departamentoIds.length) {
        await q(sb.from('lider_departamentos').insert(
          departamentoIds.map((departamento_id) => ({ user_id, departamento_id }))
        ))
      }
    },

    // ---- autenticação (Supabase Auth) ----
    auth: {
      async getUser() {
        const { data } = await sb.auth.getSession()
        return data.session?.user ?? null
      },
      async signIn(email, senha) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password: senha })
        if (error) {
          throw new Error(
            /invalid login credentials/i.test(error.message) ? 'E-mail ou senha incorretos' : error.message
          )
        }
        return data.user
      },
      async signOut() {
        await sb.auth.signOut()
      },
      // Cadastro: cria a conta e vincula à igreja pelo código de convite.
      async signUp(nome, email, senha, codigoIgreja) {
        const { data, error } = await sb.auth.signUp({
          email,
          password: senha,
          options: { data: { nome } },
        })
        if (error) {
          if (/already registered/i.test(error.message)) throw new Error('Este e-mail já tem uma conta — use "Entrar".')
          if (/at least 6/i.test(error.message)) throw new Error('A senha precisa ter pelo menos 6 caracteres.')
          throw new Error(error.message)
        }
        if (!data.session) {
          throw new Error(
            'Conta criada, mas o projeto exige confirmação de e-mail. Peça ao administrador para desativar "Confirm email" no Supabase e tente entrar.'
          )
        }
        const { error: e2 } = await sb.rpc('entrar_na_igreja', { codigo: codigoIgreja, nome_usuario: nome })
        if (e2) {
          throw new Error(/inválido/i.test(e2.message) ? 'Código de igreja inválido — confira com o seu líder.' : e2.message)
        }
        return data.user
      },
      // Envia o e-mail com o link de redefinição; o link volta para o app.
      async resetSenha(email) {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + import.meta.env.BASE_URL,
        })
        if (error) {
          throw new Error(
            /rate limit/i.test(error.message)
              ? 'Muitas tentativas — aguarde alguns minutos e tente de novo.'
              : error.message
          )
        }
      },
      // Troca a senha do usuário da sessão de recuperação (link do e-mail).
      async novaSenha(senha) {
        const { error } = await sb.auth.updateUser({ password: senha })
        if (error) {
          if (/at least 6|password.*short/i.test(error.message)) throw new Error('A senha precisa ter pelo menos 6 caracteres.')
          if (/different from the old/i.test(error.message)) throw new Error('A nova senha precisa ser diferente da antiga.')
          throw new Error(error.message)
        }
      },
      onChange(cb) {
        const { data } = sb.auth.onAuthStateChange((evento, sessao) => cb(sessao?.user ?? null, evento))
        return () => data.subscription.unsubscribe()
      },
    },

    async createPessoa({ nome, telefone, ativo = true }) {
      return (await q(sb.from('pessoas').insert({
        nome, telefone: telefone || '', ativo,
        ...(igrejaForcada ? { igreja_id: igrejaForcada } : {}),
      }).select()))[0]
    },
    async updatePessoa(id, patch) {
      await q(sb.from('pessoas').update(patch).eq('id', id))
    },
    async deletePessoa(id) {
      await q(sb.from('pessoas').delete().eq('id', id))
    },

    async createDepartamento({ nome, cor }) {
      return (await q(sb.from('departamentos').insert({
        nome, cor,
        ...(igrejaForcada ? { igreja_id: igrejaForcada } : {}),
      }).select()))[0]
    },
    async updateDepartamento(id, patch) {
      await q(sb.from('departamentos').update(patch).eq('id', id))
    },
    async deleteDepartamento(id) {
      await q(sb.from('departamentos').delete().eq('id', id))
    },

    async createFuncao({ departamento_id, nome }) {
      return (await q(sb.from('funcoes').insert({
        departamento_id, nome,
        ...(igrejaForcada ? { igreja_id: igrejaForcada } : {}),
      }).select()))[0]
    },
    async updateFuncao(id, patch) {
      await q(sb.from('funcoes').update(patch).eq('id', id))
    },
    async deleteFuncao(id) {
      await q(sb.from('funcoes').delete().eq('id', id))
    },

    async addMembroFuncao(pessoa_id, funcao_id) {
      await q(sb.from('membro_funcoes').upsert({
        pessoa_id, funcao_id,
        ...(igrejaForcada ? { igreja_id: igrejaForcada } : {}),
      }))
    },
    async removeMembroFuncao(pessoa_id, funcao_id) {
      await q(sb.from('membro_funcoes').delete().eq('pessoa_id', pessoa_id).eq('funcao_id', funcao_id))
    },

    async addIndisponibilidade(pessoa_id, data) {
      await q(sb.from('indisponibilidades').upsert({
        pessoa_id, data,
        ...(igrejaForcada ? { igreja_id: igrejaForcada } : {}),
      }))
    },
    async removeIndisponibilidade(pessoa_id, data) {
      await q(sb.from('indisponibilidades').delete().eq('pessoa_id', pessoa_id).eq('data', data))
    },

    async addIndisponibilidadeSemanal(pessoa_id, dia_semana) {
      await q(sb.from('indisponibilidades_semanais').upsert({
        pessoa_id, dia_semana,
        ...(igrejaForcada ? { igreja_id: igrejaForcada } : {}),
      }))
    },
    async removeIndisponibilidadeSemanal(pessoa_id, dia_semana) {
      await q(sb.from('indisponibilidades_semanais').delete().eq('pessoa_id', pessoa_id).eq('dia_semana', dia_semana))
    },

    async createEscala({ data, titulo }) {
      return (await q(sb.from('escalas').insert({
        data, titulo,
        ...(igrejaForcada ? { igreja_id: igrejaForcada } : {}),
      }).select()))[0]
    },
    async updateEscala(id, patch) {
      await q(sb.from('escalas').update(patch).eq('id', id))
    },
    async deleteEscala(id) {
      await q(sb.from('escalas').delete().eq('id', id))
    },

    async addEscalaItem(escala_id, funcao_id) {
      return (await q(sb.from('escala_itens').insert({
        escala_id, funcao_id, pessoa_id: null,
        ...(igrejaForcada ? { igreja_id: igrejaForcada } : {}),
      }).select()))[0]
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

    // Migra para a nuvem um banco inteiro vindo do modo localStorage
    // (os ids locais já são UUIDs, então são preservados).
    async importarDb(db) {
      const inserir = async (tabela, linhas) => {
        if (linhas && linhas.length) await q(sb.from(tabela).insert(linhas))
      }
      await inserir('pessoas', db.pessoas)
      await inserir('departamentos', db.departamentos)
      await inserir('funcoes', db.funcoes)
      await inserir('membro_funcoes', db.membro_funcoes)
      await inserir('indisponibilidades', db.indisponibilidades)
      await inserir('indisponibilidades_semanais', db.indisponibilidades_semanais)
      await inserir('escalas', db.escalas)
      await inserir('escala_itens', db.escala_itens)
    },
  }
}
