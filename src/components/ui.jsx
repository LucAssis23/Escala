// Componentes visuais reutilizáveis.
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export function Botao({ children, variante = 'primario', className = '', ...props }) {
  const estilos = {
    primario: 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-indigo-300 disabled:shadow-none',
    secundario: 'bg-white text-slate-700 border border-slate-300 hover:border-slate-400 active:bg-slate-50',
    perigo: 'bg-red-600 text-white hover:bg-red-500 active:bg-red-700',
    verde: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 hover:bg-emerald-500 active:bg-emerald-700',
  }
  return (
    <button
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${estilos[variante]} ${className}`}
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
  // portal: garante que o modal fique acima de tudo, fora de qualquer
  // stacking context criado por animações nas páginas
  return createPortal(
    <div className="anim-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center" onClick={onFechar}>
      <div
        className="anim-slide-up max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-w-lg sm:rounded-3xl"
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
    </div>,
    document.body
  )
}

export function Vazio({ icone = '🗒️', children }) {
  return (
    <div className="anim-fade-in rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
      <div className="mb-2 text-4xl">{icone}</div>
      {children}
    </div>
  )
}

// Placeholder de carregamento (skeleton) — usado enquanto os dados chegam.
export function Skeleton() {
  return (
    <div className="anim-shimmer space-y-3 p-4" aria-label="Carregando">
      <div className="h-10 w-2/3 rounded-2xl bg-slate-200" />
      <div className="h-24 rounded-2xl bg-slate-200" />
      <div className="h-24 rounded-2xl bg-slate-200" />
      <div className="h-24 rounded-2xl bg-slate-200" />
    </div>
  )
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
  return createPortal(
    <div className="anim-slide-up pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
      {mensagem}
    </div>,
    document.body
  )
}

export const CORES_DEPARTAMENTO = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b',
]
