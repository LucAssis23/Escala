import { useMemo, useState } from 'react'
import { useData } from '../data/DataContext'
import { Vazio } from '../components/ui'
import { MESES, mesmoMes } from '../lib/datas'

// "Minha carga": ranking de quantas vezes cada pessoa serviu no mês,
// para conferir se o rodízio está justo.
export default function CargaPage() {
  const { db } = useData()
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth() + 1)

  const navegar = (delta) => {
    let m = mes + delta
    let a = ano
    if (m < 1) { m = 12; a-- }
    if (m > 12) { m = 1; a++ }
    setMes(m)
    setAno(a)
  }

  const ranking = useMemo(() => {
    const escalasDoMes = new Set(db.escalas.filter((e) => mesmoMes(e.data, ano, mes)).map((e) => e.id))
    const contagem = new Map()
    for (const item of db.escala_itens) {
      if (item.pessoa_id && escalasDoMes.has(item.escala_id)) {
        contagem.set(item.pessoa_id, (contagem.get(item.pessoa_id) || 0) + 1)
      }
    }
    return db.pessoas
      .filter((p) => p.ativo || contagem.has(p.id))
      .map((p) => ({ pessoa: p, vezes: contagem.get(p.id) || 0 }))
      .sort((a, b) => b.vezes - a.vezes || a.pessoa.nome.localeCompare(b.pessoa.nome, 'pt-BR'))
  }, [db, ano, mes])

  const max = Math.max(1, ...ranking.map((r) => r.vezes))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm">
        <button onClick={() => navegar(-1)} className="rounded-xl px-3 py-1.5 text-lg font-bold text-indigo-600 active:bg-indigo-50">‹</button>
        <h2 className="font-bold capitalize">{MESES[mes - 1]} de {ano}</h2>
        <button onClick={() => navegar(1)} className="rounded-xl px-3 py-1.5 text-lg font-bold text-indigo-600 active:bg-indigo-50">›</button>
      </div>

      <p className="text-sm text-slate-500">
        Quantas vezes cada pessoa serviu no mês. Use para conferir se o rodízio está justo.
      </p>

      {ranking.length === 0 && <Vazio>Nenhuma pessoa cadastrada.</Vazio>}

      <ul className="space-y-1.5">
        {ranking.map(({ pessoa, vezes }, i) => (
          <li key={pessoa.id} className="rounded-2xl bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">
                <span className="mr-2 text-slate-400">{i + 1}º</span>
                {pessoa.nome}
              </span>
              <span className={`font-bold ${vezes === 0 ? 'text-slate-300' : 'text-indigo-600'}`}>
                {vezes}×
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${(vezes / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
