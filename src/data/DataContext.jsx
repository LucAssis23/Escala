import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { repo } from './repo'

const DataContext = createContext(null)

const VAZIO = {
  pessoas: [],
  departamentos: [],
  funcoes: [],
  membro_funcoes: [],
  indisponibilidades: [],
  indisponibilidades_semanais: [],
  escalas: [],
  escala_itens: [],
  perfis: [],
  lider_departamentos: [],
  perfil: null,
}

export function DataProvider({ children }) {
  const [db, setDb] = useState(VAZIO)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [offline, setOffline] = useState(false)

  // Autenticação: só quando o backend expõe auth (Supabase); modo local dispensa login.
  const requerLogin = !!repo.auth
  const [usuario, setUsuario] = useState(null)
  const [authPronto, setAuthPronto] = useState(!requerLogin)

  const recarregar = useCallback(async () => {
    try {
      // merge com VAZIO protege contra caches antigos sem as coleções novas
      setDb({ ...VAZIO, ...(await repo.loadAll()) })
      setOffline(repo.offline === true)
      setErro(null)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (!requerLogin) return
    let ativo = true
    repo.auth.getUser().then((u) => {
      if (ativo) {
        setUsuario(u)
        setAuthPronto(true)
      }
    })
    const parar = repo.auth.onChange((u) => setUsuario(u))
    return () => {
      ativo = false
      parar?.()
    }
  }, [requerLogin])

  useEffect(() => {
    if (authPronto && (!requerLogin || usuario)) recarregar()
  }, [authPronto, usuario, requerLogin, recarregar])

  // Envolve cada método do repositório: executa e recarrega os dados.
  const acoes = useMemo(() => {
    const nomes = [
      'createPessoa', 'updatePessoa', 'deletePessoa',
      'createDepartamento', 'updateDepartamento', 'deleteDepartamento',
      'createFuncao', 'updateFuncao', 'deleteFuncao',
      'addMembroFuncao', 'removeMembroFuncao',
      'addIndisponibilidade', 'removeIndisponibilidade',
      'addIndisponibilidadeSemanal', 'removeIndisponibilidadeSemanal',
      'createEscala', 'updateEscala', 'deleteEscala',
      'addEscalaItem', 'removeEscalaItem', 'setEscalaItemPessoa', 'setEscalaItensPessoas',
      'updatePerfil', 'deletePerfil', 'setLiderDepartamentos',
    ]
    const obj = {}
    for (const nome of nomes) {
      if (typeof repo[nome] !== 'function') continue
      obj[nome] = async (...args) => {
        try {
          const r = await repo[nome](...args)
          await recarregar()
          return r
        } catch (e) {
          setErro(e.message)
          throw e
        }
      }
    }
    // Importa para a nuvem os dados que ficaram salvos no aparelho
    // quando o app rodava no modo localStorage.
    obj.importarDadosLocais = async () => {
      const raw = localStorage.getItem('escala-igreja-db-v1')
      if (!raw || !repo.importarDb) return
      try {
        await repo.importarDb(JSON.parse(raw))
        await recarregar()
      } catch (e) {
        setErro(e.message)
        throw e
      }
    }
    return obj
  }, [recarregar])

  // Há dados locais para migrar quando o backend é Supabase e a nuvem está vazia?
  const temDadosLocaisParaImportar = useMemo(() => {
    if (repo.nome !== 'supabase' || offline) return false
    const vazio = Object.values(db).every((lista) => !lista || lista.length === 0)
    if (!vazio) return false
    try {
      const local = JSON.parse(localStorage.getItem('escala-igreja-db-v1') || 'null')
      return !!local && Object.values(local).some((lista) => Array.isArray(lista) && lista.length > 0)
    } catch {
      return false
    }
  }, [db, offline])

  // Permissões derivadas do perfil: admin tudo; líder edita apenas os
  // departamentos que lidera; membro é somente leitura.
  const permissoes = useMemo(() => {
    const perfil = db.perfil
    const papel = perfil?.papel || null
    const ehAdmin = papel === 'admin'
    const ehLider = papel === 'lider'
    const liderados = new Set(
      (db.lider_departamentos || [])
        .filter((l) => l.user_id === perfil?.user_id)
        .map((l) => l.departamento_id)
    )
    const podeEditarDepartamento = (depId) => ehAdmin || (ehLider && liderados.has(depId))
    const podeEditarFuncao = (funcaoId) => {
      if (ehAdmin) return true
      const f = db.funcoes.find((x) => x.id === funcaoId)
      return f ? podeEditarDepartamento(f.departamento_id) : false
    }
    // null = todas (admin); Set = apenas estas (líder); Set vazio = nenhuma (membro)
    const funcoesPermitidas = ehAdmin
      ? null
      : new Set(db.funcoes.filter((f) => podeEditarDepartamento(f.departamento_id)).map((f) => f.id))
    return {
      perfil, papel, ehAdmin, ehLider,
      somenteLeitura: !ehAdmin && !ehLider,
      podeGerenciarEscalas: ehAdmin || ehLider,
      departamentosLiderados: liderados,
      podeEditarDepartamento, podeEditarFuncao, funcoesPermitidas,
    }
  }, [db])

  const valor = useMemo(
    () => ({
      db, carregando, erro, offline, acoes, permissoes,
      backend: repo.nome,
      temDadosLocaisParaImportar,
      requerLogin, authPronto, usuario,
      entrar: repo.auth ? repo.auth.signIn : null,
      cadastrar: repo.auth ? repo.auth.signUp : null,
      sair: repo.auth ? repo.auth.signOut : null,
      recarregar,
      limparErro: () => setErro(null),
    }),
    [db, carregando, erro, offline, acoes, permissoes, temDadosLocaisParaImportar, requerLogin, authPronto, usuario, recarregar]
  )

  return <DataContext.Provider value={valor}>{children}</DataContext.Provider>
}

export function useData() {
  return useContext(DataContext)
}
