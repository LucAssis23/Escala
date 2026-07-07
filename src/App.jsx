import { useState } from 'react'
import { useData } from './data/DataContext'
import EscalasPage from './pages/EscalasPage'
import CalendarioPage from './pages/CalendarioPage'
import PessoasPage from './pages/PessoasPage'
import DepartamentosPage from './pages/DepartamentosPage'
import CargaPage from './pages/CargaPage'

const ABAS = [
  { id: 'escalas', rotulo: 'Escalas', icone: '📋' },
  { id: 'calendario', rotulo: 'Agenda', icone: '🗓️' },
  { id: 'pessoas', rotulo: 'Pessoas', icone: '👥' },
  { id: 'departamentos', rotulo: 'Deptos', icone: '🎯' },
  { id: 'carga', rotulo: 'Carga', icone: '📊' },
]

export default function App() {
  const { carregando, erro, offline, backend, acoes, temDadosLocaisParaImportar, limparErro } = useData()
  const [aba, setAba] = useState('escalas')
  const [importando, setImportando] = useState(false)
  // escala aberta na tela de detalhe (compartilhada entre Escalas e Agenda)
  const [escalaAbertaId, setEscalaAbertaId] = useState(null)

  const abrirEscala = (id) => {
    setEscalaAbertaId(id)
    setAba('escalas')
  }

  if (carregando) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Carregando…</div>
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-24">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-extrabold text-indigo-700">⛪ Escala da Igreja</h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {backend === 'supabase' ? (offline ? '📴 Offline' : '🌐 Sincronizado') : '📱 Só neste aparelho'}
          </span>
        </div>
      </header>

      {offline && (
        <div className="m-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          📴 Sem conexão — exibindo a última versão sincronizada. Alterações precisam de internet.
        </div>
      )}

      {temDadosLocaisParaImportar && (
        <div className="m-4 space-y-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800">
          <p>
            ☁️ A nuvem está vazia, mas há dados salvos <b>neste aparelho</b> (do modo local). Quer enviá-los para a
            nuvem e sincronizar com todo mundo?
          </p>
          <button
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-indigo-300"
            disabled={importando}
            onClick={async () => {
              setImportando(true)
              try {
                await acoes.importarDadosLocais()
              } finally {
                setImportando(false)
              }
            }}
          >
            {importando ? 'Importando…' : 'Importar dados deste aparelho'}
          </button>
        </div>
      )}

      {erro && (
        <div className="m-4 flex items-start justify-between gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span>Erro: {erro}</span>
          <button onClick={limparErro} className="font-bold">✕</button>
        </div>
      )}

      <main className="p-4">
        {aba === 'escalas' && (
          <EscalasPage escalaAbertaId={escalaAbertaId} setEscalaAbertaId={setEscalaAbertaId} />
        )}
        {aba === 'calendario' && <CalendarioPage abrirEscala={abrirEscala} />}
        {aba === 'pessoas' && <PessoasPage />}
        {aba === 'departamentos' && <DepartamentosPage />}
        {aba === 'carga' && <CargaPage />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-2xl">
          {ABAS.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                setAba(a.id)
                if (a.id !== 'escalas') setEscalaAbertaId(null)
              }}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                aba === a.id ? 'text-indigo-600' : 'text-slate-400'
              }`}
            >
              <span className="text-xl leading-none">{a.icone}</span>
              {a.rotulo}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
