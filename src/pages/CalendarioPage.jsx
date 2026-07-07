import { useMemo, useState } from 'react'
import { useData } from '../data/DataContext'
import { MESES, hojeISO, toISO } from '../lib/datas'

// Calendário mensal com as escalas de cada dia.
export default function CalendarioPage({ abrirEscala }) {
  const { db } = useData()
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1) // 1-12

  const navegar = (delta) => {
    let m = mes + delta
    let a = ano
    if (m < 1) { m = 12; a-- }
    if (m > 12) { m = 1; a++ }
    setMes(m)
    setAno(a)
  }

  // Semanas do mês: matriz de células { iso, dia, dentroDoMes }
  const semanas = useMemo(() => {
    const primeiro = new Date(ano, mes - 1, 1)
    const inicio = new Date(primeiro)
    inicio.setDate(inicio.getDate() - primeiro.getDay()) // volta até domingo
    const linhas = []
    const cursor = new Date(inicio)
    do {
      const linha = []
      for (let i = 0; i < 7; i++) {
        linha.push({ iso: toISO(cursor), dia: cursor.getDate(), dentroDoMes: cursor.getMonth() === mes - 1 })
        cursor.setDate(cursor.getDate() + 1)
      }
      linhas.push(linha)
    } while (cursor.getMonth() === mes - 1)
    return linhas
  }, [ano, mes])

  const escalasPorDia = useMemo(() => {
    const m = new Map()
    for (const e of db.escalas) {
      if (!m.has(e.data)) m.set(e.data, [])
      m.get(e.data).push(e)
    }
    return m
  }, [db.escalas])

  const iso = hojeISO()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm">
        <button onClick={() => navegar(-1)} className="rounded-xl px-3 py-1.5 text-lg font-bold text-indigo-600 active:bg-indigo-50">‹</button>
        <h2 className="font-bold capitalize">{MESES[mes - 1]} de {ano}</h2>
        <button onClick={() => navegar(1)} className="rounded-xl px-3 py-1.5 text-lg font-bold text-indigo-600 active:bg-indigo-50">›</button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-100 text-center text-[11px] font-bold uppercase text-slate-400">
          {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        {semanas.map((linha, i) => (
          <div key={i} className="grid grid-cols-7 border-b border-slate-100 last:border-0">
            {linha.map((cel) => {
              const escalas = escalasPorDia.get(cel.iso) || []
              return (
                <div key={cel.iso} className={`min-h-16 border-r border-slate-100 p-1 last:border-r-0 ${cel.dentroDoMes ? '' : 'bg-slate-50'}`}>
                  <div
                    className={`mb-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                      cel.iso === iso ? 'bg-indigo-600 text-white' : cel.dentroDoMes ? 'text-slate-700' : 'text-slate-300'
                    }`}
                  >
                    {cel.dia}
                  </div>
                  <div className="space-y-0.5">
                    {escalas.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => abrirEscala(e.id)}
                        className="block w-full truncate rounded bg-indigo-100 px-1 py-0.5 text-left text-[10px] font-semibold leading-tight text-indigo-800 active:bg-indigo-200"
                        title={e.titulo}
                      >
                        {e.titulo}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-slate-400">Toque em uma escala para abrir.</p>
    </div>
  )
}
