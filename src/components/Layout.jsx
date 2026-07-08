// Estrutura visual do app: sidebar no desktop, navegação inferior no celular,
// cabeçalho e avisos globais.
import { useState } from 'react'
import { useData } from '../data/DataContext'

const ABAS = [
  { id: 'escalas', rotulo: 'Escalas', icone: '📋' },
  { id: 'calendario', rotulo: 'Agenda', icone: '🗓️' },
  { id: 'pessoas', rotulo: 'Pessoas', icone: '👥' },
  { id: 'departamentos', rotulo: 'Departamentos', icone: '🎯', rotuloCurto: 'Deptos' },
  { id: 'carga', rotulo: 'Carga', icone: '📊' },
]

function SeloEstado() {
  const { backend, offline } = useData()
  return (
    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
      {backend === 'supabase' ? (offline ? '📴 Offline' : '🌐 Sincronizado') : '📱 Só neste aparelho'}
    </span>
  )
}

function Avisos() {
  const { erro, offline, acoes, temDadosLocaisParaImportar, limparErro } = useData()
  const [importando, setImportando] = useState(false)
  return (
    <>
      {offline && (
        <div className="anim-fade-in m-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 shadow-sm">
          📴 Sem conexão — exibindo a última versão sincronizada. Alterações precisam de internet.
        </div>
      )}
      {temDadosLocaisParaImportar && (
        <div className="anim-fade-in m-4 space-y-2 rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800 shadow-sm">
          <p>
            ☁️ A nuvem está vazia, mas há dados salvos <b>neste aparelho</b> (do modo local). Quer enviá-los para a
            nuvem e sincronizar com todo mundo?
          </p>
          <button
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:bg-indigo-300"
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
        <div className="anim-fade-in m-4 flex items-start justify-between gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 shadow-sm">
          <span>Erro: {erro}</span>
          <button onClick={limparErro} className="font-bold">✕</button>
        </div>
      )}
    </>
  )
}

export default function Layout({ aba, aoTrocarAba, children }) {
  const { usuario, sair, permissoes } = useData()

  return (
    <div className="min-h-screen lg:flex">
      {/* ---- sidebar (desktop) ---- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-gradient-to-b from-indigo-700 via-indigo-700 to-violet-800 text-white shadow-xl lg:flex">
        <div className="px-5 pb-4 pt-6">
          <h1 className="text-xl font-extrabold tracking-tight">⛪ Escala da Igreja</h1>
          {permissoes.perfil?.igreja?.nome && (
            <p className="mt-1 truncate text-xs font-medium text-indigo-200">{permissoes.perfil.igreja.nome}</p>
          )}
          <div className="mt-2"><SeloEstado /></div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {ABAS.map((a) => (
            <button
              key={a.id}
              onClick={() => aoTrocarAba(a.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ${
                aba === a.id ? 'bg-white/15 shadow-inner' : 'text-indigo-100 hover:bg-white/10'
              }`}
            >
              <span className="text-lg leading-none">{a.icone}</span>
              {a.rotulo}
            </button>
          ))}
        </nav>
        {usuario && (
          <div className="border-t border-white/10 p-4">
            <p className="truncate text-xs font-medium text-indigo-200">
              {permissoes.perfil?.nome || usuario.email}
              {permissoes.papel && <span className="ml-1 uppercase opacity-70">· {permissoes.papel}</span>}
            </p>
            {sair && (
              <button
                onClick={sair}
                className="mt-2 w-full rounded-xl bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-wide transition-all hover:bg-white/20 active:scale-[0.98]"
              >
                Sair
              </button>
            )}
          </div>
        )}
      </aside>

      {/* ---- conteúdo ---- */}
      <div className="min-h-screen flex-1 pb-24 lg:pb-8 lg:pl-64">
        <header className="sticky top-0 z-40 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white shadow-md lg:hidden">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-extrabold tracking-tight">⛪ Escala da Igreja</h1>
            <div className="flex items-center gap-2">
              <SeloEstado />
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

        <div className="mx-auto max-w-2xl lg:max-w-5xl">
          <Avisos />
          <main key={aba} className="anim-fade-in p-4">{children}</main>
        </div>
      </div>

      {/* ---- navegação inferior (celular) ---- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
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
              {a.rotuloCurto || a.rotulo}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
