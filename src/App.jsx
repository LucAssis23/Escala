import { useState } from 'react'
import { useData } from './data/DataContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import EscalasPage from './pages/EscalasPage'
import CalendarioPage from './pages/CalendarioPage'
import PessoasPage from './pages/PessoasPage'
import DepartamentosPage from './pages/DepartamentosPage'
import CargaPage from './pages/CargaPage'

export default function App() {
  const { carregando, requerLogin, authPronto, usuario } = useData()
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
    <div className="flex min-h-screen items-center justify-center text-slate-500">Carregando…</div>
  )
}
