// Estrutura visual do app: cabeçalho, avisos globais e navegação inferior.
import { useState } from 'react'
import { useData } from '../data/DataContext'

const ABAS = [
  { id: 'escalas', rotulo: 'Escalas', icone: '📋' },
  { id: 'calendario', rotulo: 'Agenda', icone: '🗓️' },
  { id: 'pessoas', rotulo: 'Pessoas', icone: '👥' },
  { id: 'departamentos', rotulo: 'Deptos', icone: '🎯' },
  { id: 'carga', rotulo: 'Carga', icone: '📊' },
]

export default function Layout({ aba, aoTrocarAba, children }) {
  const { erro, offline, backend, acoes, usuario, sair, temDadosLocaisParaImportar, limparErro } = useData()
  const [importando, setImportando] = useState(false)

  return (
    <div className="mx-auto min-h-screen max-w-2xl pb-24">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white shadow-md">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-extrabold tracking-tight">⛪ Escala da Igreja</h1>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
              {backend === 'supabase' ? (offline ? '📴 Offline' : '🌐 Sincronizado') : '📱 Só neste aparelho'}
            </span>
            {usuario && sair && (
              <button
                onClick={sair}
                className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide active:bg-white/25"
                title={usuario.email}
              >
                Sair
              </button>
            )}
          </div>
        </div>
      </header>

      {offline && (
        <div className="m-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 shadow-sm">
          📴 Sem conexão — exibindo a última versão sincronizada. Alterações precisam de internet.
        </div>
      )}

      {temDadosLocaisParaImportar && (
        <div className="m-4 space-y-2 rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800 shadow-sm">
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
        <div className="m-4 flex items-start justify-between gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 shadow-sm">
          <span>Erro: {erro}</span>
          <button onClick={limparErro} className="font-bold">✕</button>
        </div>
      )}

      <main className="p-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl px-1 py-1">
          {ABAS.map((a) => (
            <button
              key={a.id}
              onClick={() => aoTrocarAba(a.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-semibold transition-colors ${
                aba === a.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 active:bg-slate-50'
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
