import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { repo } from './repo'

const DataContext = createContext(null)

const VAZIO = {
  pessoas: [],
  departamentos: [],
  funcoes: [],
  membro_funcoes: [],
  indisponibilidades: [],
  escalas: [],
  escala_itens: [],
}

export function DataProvider({ children }) {
  const [db, setDb] = useState(VAZIO)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [offline, setOffline] = useState(false)

  const recarregar = useCallback(async () => {
    try {
      setDb(await repo.loadAll())
      setOffline(repo.offline === true)
      setErro(null)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  // Envolve cada método do repositório: executa e recarrega os dados.
  const acoes = useMemo(() => {
    const nomes = [
      'createPessoa', 'updatePessoa', 'deletePessoa',
      'createDepartamento', 'updateDepartamento', 'deleteDepartamento',
      'createFuncao', 'updateFuncao', 'deleteFuncao',
      'setMembroFuncoes',
      'addIndisponibilidade', 'removeIndisponibilidade',
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
      limparErro: () => setErro(null),
    }),
    [db, carregando, erro, offline, acoes, temDadosLocaisParaImportar]
  )

  return <DataContext.Provider value={valor}>{children}</DataContext.Provider>
}

export function useData() {
  return useContext(DataContext)
}
