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
      'setMembroFuncoes',
      'addIndisponibilidade', 'removeIndisponibilidade',
      'addIndisponibilidadeSemanal', 'removeIndisponibilidadeSemanal',
      'createEscala', 'updateEscala', 'deleteEscala',
      'addEscalaItem', 'removeEscalaItem', 'setEscalaItemPessoa', 'setEscalaItensPessoas',
    ]
    const obj = {}
    for (const nome of nomes) {
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

  const valor = useMemo(
    () => ({
      db, carregando, erro, offline, acoes,
      backend: repo.nome,
      temDadosLocaisParaImportar,
      requerLogin, authPronto, usuario,
      entrar: repo.auth ? repo.auth.signIn : null,
      sair: repo.auth ? repo.auth.signOut : null,
      limparErro: () => setErro(null),
    }),
    [db, carregando, erro, offline, acoes, temDadosLocaisParaImportar, requerLogin, authPronto, usuario]
  )

  return <DataContext.Provider value={valor}>{children}</DataContext.Provider>
}

export function useData() {
  return useContext(DataContext)
}
