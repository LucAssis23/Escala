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

  const recarregar = useCallback(async () => {
    try {
      setDb(await repo.loadAll())
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
    return obj
  }, [recarregar])

  const valor = useMemo(
    () => ({ db, carregando, erro, acoes, backend: repo.nome, limparErro: () => setErro(null) }),
    [db, carregando, erro, acoes]
  )

  return <DataContext.Provider value={valor}>{children}</DataContext.Provider>
}

export function useData() {
  return useContext(DataContext)
}
