// Componentes visuais reutilizáveis.
import { useEffect } from 'react'

export function Botao({ children, variante = 'primario', className = '', ...props }) {
  const estilos = {
    primario: 'bg-indigo-600 text-white active:bg-indigo-700 disabled:bg-indigo-300',
    secundario: 'bg-white text-slate-700 border border-slate-300 active:bg-slate-50',
    perigo: 'bg-red-600 text-white active:bg-red-700',
    verde: 'bg-emerald-600 text-white active:bg-emerald-700',
  }
  return (
    <button
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${estilos[variante]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Campo({ rotulo, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{rotulo}</span>
      {children}
    </label>
  )
}

export const estiloInput =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

export function Modal({ titulo, aberto, onFechar, children }) {
  useEffect(() => {
    if (!aberto) return
    const fn = (e) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [aberto, onFechar])

  if (!aberto) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onFechar}>
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button onClick={onFechar} className="rounded-full p-2 text-slate-400 active:bg-slate-100" aria-label="Fechar">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Vazio({ children }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{children}</div>
}

export function BadgeDepartamento({ dep, className = '' }) {
  if (!dep) return null
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${className}`}
      style={{ backgroundColor: dep.cor }}
    >
      {dep.nome}
    </span>
  )
}

export function Toast({ mensagem }) {
  if (!mensagem) return null
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
      {mensagem}
    </div>
  )
}

export const CORES_DEPARTAMENTO = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b',
]
