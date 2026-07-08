import { useMemo, useState } from 'react'
import { useData } from '../data/DataContext'
import { Botao, Campo, Modal, Toast, Vazio, estiloInput } from '../components/ui'
import { DIAS_SEMANA_CHIPS, datasDoMes, formatarDataBR, formatarDataLonga, hojeISO, MESES } from '../lib/datas'
import { pessoasElegiveis, pessoasDuplicadas, sortearVagas } from '../lib/escalas'
import { textoWhatsApp, copiarTexto } from '../lib/whatsapp'

export default function EscalasPage({ escalaAbertaId, setEscalaAbertaId }) {
  const { db } = useData()
  const [criando, setCriando] = useState(false)
  const [gerandoMes, setGerandoMes] = useState(false)

  const escala = db.escalas.find((e) => e.id === escalaAbertaId)
  if (escala) return <EscalaDetalhe escala={escala} onVoltar={() => setEscalaAbertaId(null)} />

  const futuras = db.escalas.filter((e) => e.data >= hojeISO()).sort((a, b) => a.data.localeCompare(b.data))
  const passadas = db.escalas.filter((e) => e.data < hojeISO()).sort((a, b) => b.data.localeCompare(a.data))

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Botao variante="secundario" onClick={() => setGerandoMes(true)}>🗓️ Gerar mês</Botao>
        <Botao onClick={() => setCriando(true)}>+ Nova escala</Botao>
      </div>

      {db.escalas.length === 0 && (
        <Vazio>Nenhuma escala criada. Cadastre pessoas, departamentos e funções, depois crie a primeira escala.</Vazio>
      )}

      <ListaEscalas titulo="Próximas" escalas={futuras} abrir={setEscalaAbertaId} />
      <ListaEscalas titulo="Anteriores" escalas={passadas} abrir={setEscalaAbertaId} />

      {criando && <ModalNovaEscala onFechar={() => setCriando(false)} onCriada={setEscalaAbertaId} />}
      {gerandoMes && <ModalGerarMes onFechar={() => setGerandoMes(false)} />}
    </div>
  )
}

// Gera de uma vez todas as escalas do mês nos dias da semana escolhidos
// (todo domingo, toda quinta…), com sorteio automático opcional que mantém
// o rodízio justo entre as semanas.
function ModalGerarMes({ onFechar }) {
  const { db, acoes } = useData()
  const agora = new Date()
  const [mesAno, setMesAno] = useState(
    `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
  )
  const [titulo, setTitulo] = useState('Culto')
  const [dias, setDias] = useState(new Set([0]))
  const [selecionadas, setSelecionadas] = useState(new Set())
  const [sortearAuto, setSortearAuto] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [progresso, setProgresso] = useState('')

  const alternarDia = (dia) => {
    const s = new Set(dias)
    s.has(dia) ? s.delete(dia) : s.add(dia)
    setDias(s)
  }
  const alternarFuncao = (id) => {
    const s = new Set(selecionadas)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelecionadas(s)
  }

  const [ano, mes] = mesAno.split('-').map(Number)
  const datas = mesAno ? datasDoMes(ano, mes, [...dias]) : []

  const gerar = async () => {
    if (!titulo.trim() || datas.length === 0 || selecionadas.size === 0 || gerando) return
    setGerando(true)
    try {
      // Cópia local do banco: o rodízio de cada escala gerada precisa "ver"
      // as escalas criadas logo antes dela, sem esperar recarregamentos.
      const dbLocal = { ...db, escalas: [...db.escalas], escala_itens: [...db.escala_itens] }
      for (const data of datas) {
        setProgresso(`Criando ${formatarDataBR(data)}…`)
        const escala = await acoes.createEscala({ data, titulo: titulo.trim() })
        const itens = []
        for (const funcaoId of selecionadas) {
          itens.push({ ...(await acoes.addEscalaItem(escala.id, funcaoId)) })
        }
        dbLocal.escalas.push(escala)
        dbLocal.escala_itens.push(...itens)
        if (sortearAuto) {
          const resultado = sortearVagas({ db: dbLocal, escala, itens, permitirAcumulo: false })
          await acoes.setEscalaItensPessoas(resultado)
          for (const { id, pessoa_id } of resultado) {
            const item = dbLocal.escala_itens.find((i) => i.id === id)
            if (item) item.pessoa_id = pessoa_id
          }
        }
      }
      onFechar()
    } finally {
      setGerando(false)
    }
  }

  return (
    <Modal titulo="Gerar escalas do mês" aberto onFechar={onFechar}>
      <div className="space-y-3">
        <Campo rotulo="Título das escalas *">
          <input className={estiloInput} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder='Ex.: "Culto"' />
        </Campo>
        <Campo rotulo="Mês *">
          <input type="month" className={estiloInput} value={mesAno} onChange={(e) => setMesAno(e.target.value)} />
        </Campo>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-600">Dias da semana *</span>
          <div className="flex flex-wrap gap-1.5">
            {DIAS_SEMANA_CHIPS.map((rotulo, dia) => (
              <button
                key={dia}
                type="button"
                onClick={() => alternarDia(dia)}
                className={`rounded-full px-3.5 py-2 text-sm font-semibold capitalize transition-colors ${
                  dias.has(dia) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
          {mesAno && (
            <p className="mt-1.5 text-xs text-slate-500">
              {datas.length === 0
                ? 'Escolha ao menos um dia da semana.'
                : `${datas.length} escala(s) em ${MESES[mes - 1]}: ${datas.map((d) => d.slice(8)).join(', ')}`}
            </p>
          )}
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-600">Funções a preencher *</span>
          <div className="space-y-3">
            {db.departamentos.map((dep) => {
              const funcoes = db.funcoes.filter((f) => f.departamento_id === dep.id)
              if (funcoes.length === 0) return null
              return (
                <div key={dep.id}>
                  <div className="mb-1.5 flex items-center gap-2 text-sm font-bold">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: dep.cor }} />
                    {dep.nome}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {funcoes.map((f) => (
                      <label
                        key={f.id}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                          selecionadas.has(f.id) ? 'border-indigo-400 bg-indigo-50 font-semibold' : 'border-slate-200'
                        }`}
                      >
                        <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={selecionadas.has(f.id)} onChange={() => alternarFuncao(f.id)} />
                        {f.nome}
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" className="h-5 w-5 accent-indigo-600" checked={sortearAuto} onChange={(e) => setSortearAuto(e.target.checked)} />
          Sortear automaticamente (rodízio justo entre as semanas)
        </label>

        <Botao
          className="w-full"
          disabled={!titulo.trim() || datas.length === 0 || selecionadas.size === 0 || gerando}
          onClick={gerar}
        >
          {gerando ? progresso || 'Gerando…' : `Gerar ${datas.length} escala(s)`}
        </Botao>
      </div>
    </Modal>
  )
}

function ListaEscalas({ titulo, escalas, abrir }) {
  const { db } = useData()
  if (escalas.length === 0) return null
  return (
    <div>
      <h2 className="mb-2 mt-4 text-sm font-bold uppercase tracking-wide text-slate-400">{titulo}</h2>
      <ul className="space-y-2">
        {escalas.map((e) => {
          const itens = db.escala_itens.filter((i) => i.escala_id === e.id)
          const vagas = itens.filter((i) => !i.pessoa_id).length
          return (
            <li key={e.id}>
              <button onClick={() => abrir(e.id)} className="w-full rounded-2xl bg-white p-3 text-left shadow-sm active:bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{e.titulo}</span>
                  {vagas > 0 ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                      {vagas} em aberto
                    </span>
                  ) : itens.length > 0 ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">completa</span>
                  ) : null}
                </div>
                <div className="text-sm capitalize text-slate-500">{formatarDataLonga(e.data)}</div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Criação: data, título e quais funções serão preenchidas (checkboxes por departamento).
function ModalNovaEscala({ onFechar, onCriada }) {
  const { db, acoes } = useData()
  const [data, setData] = useState(hojeISO())
  const [titulo, setTitulo] = useState('')
  const [selecionadas, setSelecionadas] = useState(new Set())
  const [salvando, setSalvando] = useState(false)

  const alternar = (id) => {
    const s = new Set(selecionadas)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelecionadas(s)
  }

  const alternarDepartamento = (depId) => {
    const ids = db.funcoes.filter((f) => f.departamento_id === depId).map((f) => f.id)
    const todas = ids.every((id) => selecionadas.has(id))
    const s = new Set(selecionadas)
    ids.forEach((id) => (todas ? s.delete(id) : s.add(id)))
    setSelecionadas(s)
  }

  const criar = async () => {
    if (!titulo.trim() || !data || selecionadas.size === 0 || salvando) return
    setSalvando(true)
    try {
      const escala = await acoes.createEscala({ data, titulo: titulo.trim() })
      for (const funcaoId of selecionadas) await acoes.addEscalaItem(escala.id, funcaoId)
      onFechar()
      onCriada(escala.id)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal titulo="Nova escala" aberto onFechar={onFechar}>
      <div className="space-y-3">
        <Campo rotulo="Título *">
          <input className={estiloInput} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder='Ex.: "Culto Domingo Manhã"' autoFocus />
        </Campo>
        <Campo rotulo="Data *">
          <input type="date" className={estiloInput} value={data} onChange={(e) => setData(e.target.value)} />
        </Campo>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-600">Funções a preencher *</span>
          {db.funcoes.length === 0 && (
            <p className="text-sm text-slate-500">Cadastre funções na aba “Deptos” primeiro.</p>
          )}
          <div className="space-y-3">
            {db.departamentos.map((dep) => {
              const funcoes = db.funcoes.filter((f) => f.departamento_id === dep.id)
              if (funcoes.length === 0) return null
              return (
                <div key={dep.id}>
                  <button type="button" onClick={() => alternarDepartamento(dep.id)} className="mb-1.5 flex items-center gap-2 text-sm font-bold">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: dep.cor }} />
                    {dep.nome}
                    <span className="text-[10px] font-semibold text-indigo-500">marcar todas</span>
                  </button>
                  <div className="grid grid-cols-2 gap-1.5">
                    {funcoes.map((f) => (
                      <label
                        key={f.id}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                          selecionadas.has(f.id) ? 'border-indigo-400 bg-indigo-50 font-semibold' : 'border-slate-200'
                        }`}
                      >
                        <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={selecionadas.has(f.id)} onChange={() => alternar(f.id)} />
                        {f.nome}
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <Botao className="w-full" disabled={!titulo.trim() || !data || selecionadas.size === 0 || salvando} onClick={criar}>
          {salvando ? 'Criando…' : `Criar escala (${selecionadas.size} função${selecionadas.size === 1 ? '' : 'ões'})`}
        </Botao>
      </div>
    </Modal>
  )
}

// Detalhe: preenchimento manual, sorteio, acúmulo, WhatsApp.
function EscalaDetalhe({ escala, onVoltar }) {
  const { db, acoes } = useData()
  const [permitirAcumulo, setPermitirAcumulo] = useState(false)
  const [toast, setToast] = useState('')
  const [editandoCabecalho, setEditandoCabecalho] = useState(false)
  const [adicionandoFuncao, setAdicionandoFuncao] = useState(false)

  const itens = useMemo(
    () => db.escala_itens.filter((i) => i.escala_id === escala.id),
    [db.escala_itens, escala.id]
  )
  const duplicadas = pessoasDuplicadas(itens)
  const vagasAbertas = itens.filter((i) => !i.pessoa_id).length

  const grupos = useMemo(() => {
    const g = []
    for (const dep of db.departamentos) {
      const doDep = itens.filter((i) => {
        const f = db.funcoes.find((x) => x.id === i.funcao_id)
        return f && f.departamento_id === dep.id
      })
      if (doDep.length) g.push({ dep, itens: doDep })
    }
    return g
  }, [db, itens])

  const avisar = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  const sortear = async () => {
    const resultado = sortearVagas({ db, escala, itens, permitirAcumulo })
    if (resultado.length === 0) return avisar('Nenhuma vaga em aberto para sortear')
    await acoes.setEscalaItensPessoas(resultado)
    const preenchidas = resultado.filter((r) => r.pessoa_id).length
    avisar(
      preenchidas === resultado.length
        ? `🎲 ${preenchidas} vaga(s) sorteada(s)!`
        : `🎲 ${preenchidas} preenchida(s); ${resultado.length - preenchidas} sem candidato elegível`
    )
  }

  const copiarWhats = async () => {
    const ok = await copiarTexto(textoWhatsApp({ escala, itens, db }))
    avisar(ok ? '✅ Texto copiado! Cole no WhatsApp.' : 'Não foi possível copiar')
  }

  return (
    <div className="space-y-3">
      <Toast mensagem={toast} />

      <button onClick={onVoltar} className="text-sm font-semibold text-indigo-600">← Voltar</button>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">{escala.titulo}</h2>
            <p className="text-sm capitalize text-slate-500">{formatarDataLonga(escala.data)}</p>
          </div>
          <button className="text-sm font-semibold text-indigo-600" onClick={() => setEditandoCabecalho(true)}>Editar</button>
        </div>

        {vagasAbertas > 0 && (
          <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            ⚠️ {vagasAbertas} vaga(s) em aberto
          </div>
        )}
        {duplicadas.size > 0 && (
          <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            ⚠️ Há pessoa(s) em mais de uma função nesta escala (acúmulo)
          </div>
        )}

        <label className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="h-5 w-5 accent-indigo-600"
            checked={permitirAcumulo}
            onChange={(e) => setPermitirAcumulo(e.target.checked)}
          />
          Permitir acúmulo (mesma pessoa em 2+ funções)
        </label>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Botao onClick={sortear}>🎲 Sortear vagas</Botao>
          <Botao variante="verde" onClick={copiarWhats}>📲 Copiar p/ WhatsApp</Botao>
        </div>
      </div>

      {grupos.map(({ dep, itens: doDep }) => (
        <div key={dep.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="px-3 py-2 font-bold text-white" style={{ backgroundColor: dep.cor }}>{dep.nome}</div>
          <ul className="divide-y divide-slate-100">
            {doDep.map((item) => (
              <ItemEscala key={item.id} item={item} escala={escala} duplicada={item.pessoa_id && duplicadas.has(item.pessoa_id)} />
            ))}
          </ul>
        </div>
      ))}

      <div className="flex gap-2">
        <Botao variante="secundario" className="flex-1" onClick={() => setAdicionandoFuncao(true)}>+ Adicionar função</Botao>
        <Botao
          variante="perigo"
          onClick={async () => {
            if (confirm(`Excluir a escala "${escala.titulo}"?`)) {
              await acoes.deleteEscala(escala.id)
              onVoltar()
            }
          }}
        >
          Excluir escala
        </Botao>
      </div>

      {editandoCabecalho && (
        <ModalCabecalho escala={escala} onFechar={() => setEditandoCabecalho(false)} />
      )}
      {adicionandoFuncao && (
        <ModalAdicionarFuncao escala={escala} itens={itens} onFechar={() => setAdicionandoFuncao(false)} />
      )}
    </div>
  )
}

function ItemEscala({ item, escala, duplicada }) {
  const { db, acoes } = useData()
  const funcao = db.funcoes.find((f) => f.id === item.funcao_id)
  const elegiveis = pessoasElegiveis(db, item.funcao_id, escala.data, item.pessoa_id)
  const vazio = !item.pessoa_id

  return (
    <li className={`flex items-center gap-2 px-3 py-2.5 ${vazio ? 'bg-red-50' : duplicada ? 'bg-amber-50' : ''}`}>
      <div className="w-28 shrink-0">
        <div className="text-sm font-semibold">{funcao?.nome}</div>
        {vazio && <span className="text-[11px] font-bold text-red-500">EM ABERTO</span>}
        {duplicada && (
          <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">ACÚMULO</span>
        )}
      </div>
      <select
        className={`${estiloInput} flex-1 ${vazio ? 'border-red-300' : duplicada ? 'border-amber-400' : ''}`}
        value={item.pessoa_id || ''}
        onChange={(e) => acoes.setEscalaItemPessoa(item.id, e.target.value || null)}
      >
        <option value="">— em aberto —</option>
        {elegiveis.map((p) => (
          <option key={p.id} value={p.id}>{p.nome}</option>
        ))}
      </select>
      <button
        className="shrink-0 p-1 text-slate-400"
        aria-label="Remover função da escala"
        onClick={() => {
          if (confirm(`Remover "${funcao?.nome}" desta escala?`)) acoes.removeEscalaItem(item.id)
        }}
      >
        ✕
      </button>
    </li>
  )
}

function ModalCabecalho({ escala, onFechar }) {
  const { acoes } = useData()
  const [titulo, setTitulo] = useState(escala.titulo)
  const [data, setData] = useState(escala.data)
  return (
    <Modal titulo="Editar escala" aberto onFechar={onFechar}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!titulo.trim() || !data) return
          await acoes.updateEscala(escala.id, { titulo: titulo.trim(), data })
          onFechar()
        }}
      >
        <Campo rotulo="Título *">
          <input className={estiloInput} value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
        </Campo>
        <Campo rotulo="Data *">
          <input type="date" className={estiloInput} value={data} onChange={(e) => setData(e.target.value)} required />
        </Campo>
        <Botao type="submit" className="w-full">Salvar</Botao>
      </form>
    </Modal>
  )
}

function ModalAdicionarFuncao({ escala, itens, onFechar }) {
  const { db, acoes } = useData()
  return (
    <Modal titulo="Adicionar função à escala" aberto onFechar={onFechar}>
      <div className="space-y-3">
        {db.departamentos.map((dep) => {
          const funcoes = db.funcoes.filter((f) => f.departamento_id === dep.id)
          if (funcoes.length === 0) return null
          return (
            <div key={dep.id}>
              <div className="mb-1.5 flex items-center gap-2 text-sm font-bold">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: dep.cor }} />
                {dep.nome}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {funcoes.map((f) => (
                  <button
                    key={f.id}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-left text-sm active:bg-indigo-50"
                    onClick={async () => {
                      await acoes.addEscalaItem(escala.id, f.id)
                      onFechar()
                    }}
                  >
                    {f.nome}
                    {itens.some((i) => i.funcao_id === f.id) && (
                      <span className="ml-1 text-[10px] font-bold text-slate-400">(já na escala)</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
