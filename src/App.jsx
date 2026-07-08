import { useState } from 'react'
import { useData } from './data/DataContext'
import Layout from './components/Layout'
import { Skeleton } from './components/ui'
import LoginPage from './pages/LoginPage'
import EscalasPage from './pages/EscalasPage'
import CalendarioPage from './pages/CalendarioPage'
import PessoasPage from './pages/PessoasPage'
import DepartamentosPage from './pages/DepartamentosPage'
import CargaPage from './pages/CargaPage'

export default function App() {
  const { carregando, requerLogin, authPronto, usuario, db } = useData()
  const [aba, setAba] = useState('escalas')
  // escala aberta na tela de detalhe (compartilhada entre Escalas e Agenda)
  const [escalaAbertaId, setEscalaAbertaId] = useState(null)

  const abrirEscala = (id) => {
    setEscalaAbertaId(id)
    setAba('escalas')
  }

  if (requerLogin && !usuario) {
    return authPronto ? <LoginPage /> : <Carregando />
  }
  if (carregando) return <Carregando />

  // Logado, mas ainda sem aprovação do admin da igreja
  if (requerLogin && (!db.perfil || !db.perfil.aprovado)) {
    return <AguardandoAprovacao />
  }

  return (
    <Layout
      aba={aba}
      aoTrocarAba={(nova) => {
        setAba(nova)
        if (nova !== 'escalas') setEscalaAbertaId(null)
      }}
    >
      {aba === 'escalas' && (
        <EscalasPage escalaAbertaId={escalaAbertaId} setEscalaAbertaId={setEscalaAbertaId} />
      )}
      {aba === 'calendario' && <CalendarioPage abrirEscala={abrirEscala} />}
      {aba === 'pessoas' && <PessoasPage />}
      {aba === 'departamentos' && <DepartamentosPage />}
      {aba === 'carga' && <CargaPage />}
    </Layout>
  )
}

function Carregando() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl">
      <div className="h-14 bg-gradient-to-r from-indigo-600 to-violet-600" />
      <Skeleton />
    </div>
  )
}

function AguardandoAprovacao() {
  const { db, sair, recarregar } = useData()
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-4">
      <div className="anim-scale-in w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
        <div className="text-5xl">⏳</div>
        <h1 className="mt-3 text-xl font-extrabold tracking-tight text-slate-800">Quase lá!</h1>
        <p className="mt-2 text-sm text-slate-500">
          Sua conta foi criada{db?.perfil?.igreja?.nome ? ` na ${db.perfil.igreja.nome}` : ''} e está{' '}
          <b>aguardando aprovação</b> de um líder. Assim que aprovarem, é só entrar de novo.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={recarregar}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 active:scale-[0.98]"
          >
            Já fui aprovado
          </button>
          {sair && (
            <button
              onClick={sair}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all active:scale-[0.98]"
            >
              Sair
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
