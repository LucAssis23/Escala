import { useMemo, useState } from 'react'
import { useData } from '../data/DataContext'
import { Vazio } from '../components/ui'
import { MESES } from '../lib/datas'

const MEDALHAS = ['🥇', '🥈', '🥉']

// "Minha carga": ranking de quantas vezes cada pessoa serviu no mês ou no
// ano, para conferir se o rodízio está justo. Expande por pessoa para ver
// em quais departamentos ela serviu.
export default function CargaPage() {
  const { db } = useData()
  const hoje = new Date()
  const [modo, setModo] = useState('mes') // 'mes' | 'ano'
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [expandido, setExpandido] = useState(null)

  const navegar = (delta) => {
    if (modo === 'ano') {
      setAno(ano + delta)
      return
    }
    let m = mes + delta
    let a = ano
    if (m < 1) { m = 12; a-- }
    if (m > 12) { m = 1; a++ }
    setMes(m)
    setAno(a)
  }

  const { ranking, porDepartamento } = useMemo(() => {
    const dentroDoPeriodo = (dataISO) => {
      const [a, m] = dataISO.split('-').map(Number)
      return modo === 'ano' ? a === ano : a === ano && m === mes
    }
    const escalasDoPeriodo = new Set(db.escalas.filter((e) => dentroDoPeriodo(e.data)).map((e) => e.id))
    const contagem = new Map()
    const porDep = new Map() // pessoa_id -> Map(departamento_id -> vezes)
    for (const item of db.escala_itens) {
      if (!item.pessoa_id || !escalasDoPeriodo.has(item.escala_id)) continue
      contagem.set(item.pessoa_id, (contagem.get(item.pessoa_id) || 0) + 1)
      const funcao = db.funcoes.find((f) => f.id === item.funcao_id)
      if (funcao) {
        if (!porDep.has(item.pessoa_id)) porDep.set(item.pessoa_id, new Map())
        const m = porDep.get(item.pessoa_id)
        m.set(funcao.departamento_id, (m.get(funcao.departamento_id) || 0) + 1)
      }
    }
    const ranking = db.pessoas
      .filter((p) => p.ativo || contagem.has(p.id))
      .map((p) => ({ pessoa: p, vezes: contagem.get(p.id) || 0 }))
      .sort((a, b) => b.vezes - a.vezes || a.pessoa.nome.localeCompare(b.pessoa.nome, 'pt-BR'))
    return { ranking, porDepartamento: porDep }
  }, [db, ano, mes, modo])

  const max = Math.max(1, ...ranking.map((r) => r.vezes))
  const ativos = ranking.filter((r) => r.pessoa.ativo)
  const media = ativos.length ? ativos.reduce((s, r) => s + r.vezes, 0) / ativos.length : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm">
        <button onClick={() => navegar(-1)} className="rounded-xl px-3 py-1.5 text-lg font-bold text-indigo-600 active:bg-indigo-50">‹</button>
        <h2 className="font-bold capitalize">{modo === 'ano' ? `Ano de ${ano}` : `${MESES[mes - 1]} de ${ano}`}</h2>
        <button onClick={() => navegar(1)} className="rounded-xl px-3 py-1.5 text-lg font-bold text-indigo-600 active:bg-indigo-50">›</button>
      </div>

      <div className="flex gap-1.5 rounded-2xl bg-white p-1.5 shadow-sm">
        {[['mes', 'Mês'], ['ano', 'Ano']].map(([id, rotulo]) => (
          <button
            key={id}
            onClick={() => setModo(id)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
              modo === id ? 'bg-indigo-600 text-white' : 'text-slate-500'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <p className="text-sm text-slate-500">
        Quantas vezes cada pessoa serviu {modo === 'ano' ? 'no ano' : 'no mês'}. Toque numa pessoa para ver por
        departamento.
        {ativos.length > 0 && (
          <>
            {' '}Média: <b>{media.toFixed(1)}×</b> por pessoa ativa.
          </>
        )}
      </p>

      {ranking.length === 0 && <Vazio>Nenhuma pessoa cadastrada.</Vazio>}

      <ul className="space-y-1.5">
        {ranking.map(({ pessoa, vezes }, i) => {
          const depDetalhe = porDepartamento.get(pessoa.id)
          const aberto = expandido === pessoa.id
          return (
            <li key={pessoa.id} className="rounded-2xl bg-white p-3 shadow-sm">
              <button
                className="flex w-full items-center justify-between gap-2 text-left text-sm"
                onClick={() => setExpandido(aberto ? null : pessoa.id)}
              >
                <span className="flex min-w-0 items-center gap-2 font-semibold">
                  <span className="w-6 shrink-0 text-slate-400">{MEDALHAS[i] || `${i + 1}º`}</span>
                  <span className="truncate">{pessoa.nome}</span>
                  {!pessoa.ativo && (
                    <span className="shrink-0 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                      INATIVO
                    </span>
                  )}
                </span>
                <span className={`shrink-0 font-bold ${vezes === 0 ? 'text-slate-300' : 'text-indigo-600'}`}>
                  {vezes}×
                </span>
              </button>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${(vezes / max) * 100}%` }}
                />
              </div>
              {aberto && (
                <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
                  {depDetalhe && depDetalhe.size > 0 ? (
                    [...depDetalhe.entries()].map(([depId, n]) => {
                      const dep = db.departamentos.find((d) => d.id === depId)
                      return (
                        <span
                          key={depId}
                          className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                          style={{ backgroundColor: dep?.cor || '#64748b' }}
                        >
                          {dep?.nome || '—'}: {n}×
                        </span>
                      )
                    })
                  ) : (
                    <span className="text-xs text-slate-400">Não serviu neste período.</span>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
