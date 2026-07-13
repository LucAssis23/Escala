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
  igrejas: [],
  perfil: null,
}

const CHAVE_IGREJA_ATIVA = 'escala-igreja-ativa-super'

export function DataProvider({ children }) {
  const [db, setDb] = useState(VAZIO)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [offline, setOffline] = useState(false)

  // Autenticação: só quando o backend expõe auth (Supabase); modo local dispensa login.
  const requerLogin = !!repo.auth
  const [usuario, setUsuario] = useState(null)
  const [authPronto, setAuthPronto] = useState(!requerLogin)
  // true enquanto o usuário chegou pelo link "redefinir senha" do e-mail
  const [recuperandoSenha, setRecuperandoSenha] = useState(false)

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
    const parar = repo.auth.onChange((u, evento) => {
      setUsuario(u)
      if (evento === 'PASSWORD_RECOVERY') setRecuperandoSenha(true)
    })
    return () => {
      ativo = false
      parar?.()
    }
  }, [requerLogin])

  useEffect(() => {
    if (authPronto && (!requerLogin || usuario)) recarregar()
  }, [authPronto, usuario, requerLogin, recarregar])

  // Chave mestre (papel "super"): admin de todas as igrejas. Ela escolhe
  // qual igreja quer operar; a escolha fica salva para a próxima visita.
  const ehSuper = db.perfil?.papel === 'super'
  const [igrejaAtivaId, setIgrejaAtivaIdState] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_IGREJA_ATIVA) || null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (!ehSuper || db.igrejas.length === 0) return
    const valida = igrejaAtivaId && db.igrejas.some((i) => i.id === igrejaAtivaId)
    const alvo = valida ? igrejaAtivaId : db.perfil?.igreja_id
    if (alvo && alvo !== igrejaAtivaId) setIgrejaAtivaIdState(alvo)
    repo.setIgrejaAtiva?.(alvo || null)
  }, [ehSuper, db.igrejas, db.perfil, igrejaAtivaId])

  const definirIgrejaAtiva = useCallback((id) => {
    setIgrejaAtivaIdState(id)
    repo.setIgrejaAtiva?.(id)
    try {
      localStorage.setItem(CHAVE_IGREJA_ATIVA, id)
    } catch {
      // localStorage indisponível não impede a troca de igreja nesta sessão
    }
  }, [])

  // Visão dos dados restrita à igreja ativa. Para todo mundo, exceto a
  // chave mestre, isso já é o que o RLS devolveu (uma igreja só); a chave
  // mestre recebe todas as igrejas do banco e escolhe uma para operar.
  const dbView = useMemo(() => {
    if (!ehSuper) return db
    const alvo = db.igrejas.some((i) => i.id === igrejaAtivaId) ? igrejaAtivaId : db.perfil?.igreja_id
    if (!alvo) return db
    const porIgreja = (lista) => (lista || []).filter((x) => x.igreja_id === alvo)
    const departamentos = porIgreja(db.departamentos)
    const depIds = new Set(departamentos.map((d) => d.id))
    return {
      ...db,
      pessoas: porIgreja(db.pessoas),
      departamentos,
      funcoes: porIgreja(db.funcoes),
      membro_funcoes: porIgreja(db.membro_funcoes),
      indisponibilidades: porIgreja(db.indisponibilidades),
      indisponibilidades_semanais: porIgreja(db.indisponibilidades_semanais),
      escalas: porIgreja(db.escalas),
      escala_itens: porIgreja(db.escala_itens),
      perfis: porIgreja(db.perfis),
      lider_departamentos: (db.lider_departamentos || []).filter((l) => depIds.has(l.departamento_id)),
    }
  }, [db, ehSuper, igrejaAtivaId])

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
    const chaves = ['pessoas', 'departamentos', 'funcoes', 'escalas']
    const vazio = chaves.every((k) => !dbView[k] || dbView[k].length === 0)
    if (!vazio) return false
    try {
      const local = JSON.parse(localStorage.getItem('escala-igreja-db-v1') || 'null')
      return !!local && Object.values(local).some((lista) => Array.isArray(lista) && lista.length > 0)
    } catch {
      return false
    }
  }, [dbView, offline])

  // Permissões derivadas do perfil: super e admin fazem tudo (super em
  // qualquer igreja que escolher); líder edita apenas os departamentos que
  // lidera; membro é somente leitura.
  const permissoes = useMemo(() => {
    const perfil = dbView.perfil
    const papel = perfil?.papel || null
    const ehSuper = papel === 'super'
    const ehAdmin = ehSuper || papel === 'admin'
    const ehLider = papel === 'lider'
    const liderados = new Set(
      (dbView.lider_departamentos || [])
        .filter((l) => l.user_id === perfil?.user_id)
        .map((l) => l.departamento_id)
    )
    const podeEditarDepartamento = (depId) => ehAdmin || (ehLider && liderados.has(depId))
    const podeEditarFuncao = (funcaoId) => {
      if (ehAdmin) return true
      const f = dbView.funcoes.find((x) => x.id === funcaoId)
      return f ? podeEditarDepartamento(f.departamento_id) : false
    }
    // null = todas (admin/super); Set = apenas estas (líder); Set vazio = nenhuma (membro)
    const funcoesPermitidas = ehAdmin
      ? null
      : new Set(dbView.funcoes.filter((f) => podeEditarDepartamento(f.departamento_id)).map((f) => f.id))
    return {
      perfil, papel, ehSuper, ehAdmin, ehLider,
      somenteLeitura: !ehAdmin && !ehLider,
      podeGerenciarEscalas: ehAdmin || ehLider,
      departamentosLiderados: liderados,
      podeEditarDepartamento, podeEditarFuncao, funcoesPermitidas,
    }
  }, [dbView])

  // Nome da igreja em operação: para a chave mestre é a escolhida no
  // seletor (não a do próprio perfil) — usado em imagens e cabeçalhos.
  const igrejaAtivaNome =
    (ehSuper && db.igrejas.find((i) => i.id === igrejaAtivaId)?.nome) ||
    db.perfil?.igreja?.nome ||
    null

  const valor = useMemo(
    () => ({
      db: dbView, carregando, erro, offline, acoes, permissoes,
      backend: repo.nome,
      temDadosLocaisParaImportar,
      requerLogin, authPronto, usuario,
      igrejas: db.igrejas, igrejaAtivaId, definirIgrejaAtiva, igrejaAtivaNome,
      entrar: repo.auth ? repo.auth.signIn : null,
      cadastrar: repo.auth ? repo.auth.signUp : null,
      sair: repo.auth ? repo.auth.signOut : null,
      resetSenha: repo.auth?.resetSenha || null,
      novaSenha: repo.auth?.novaSenha || null,
      recuperandoSenha,
      terminarRecuperacao: () => setRecuperandoSenha(false),
      recarregar,
      limparErro: () => setErro(null),
    }),
    [dbView, db.igrejas, carregando, erro, offline, acoes, permissoes, temDadosLocaisParaImportar, requerLogin, authPronto, usuario, igrejaAtivaId, definirIgrejaAtiva, igrejaAtivaNome, recarregar, recuperandoSenha]
  )

  return <DataContext.Provider value={valor}>{children}</DataContext.Provider>
}

export function useData() {
  return useContext(DataContext)
}
