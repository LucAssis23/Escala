import { useMemo, useState } from 'react'
import { useData } from '../data/DataContext'
import { Botao, Campo, Modal, Vazio, estiloInput } from '../components/ui'
import { formatarDataBR, hojeISO } from '../lib/datas'

export default function PessoasPage() {
  const { db, acoes } = useData()
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState(null) // null | { pessoa? } (sem pessoa = nova)
  const [vinculando, setVinculando] = useState(null) // pessoa
  const [indisp, setIndisp] = useState(null) // pessoa

  const pessoas = useMemo(
    () =>
      [...db.pessoas]
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase())),
    [db.pessoas, busca]
  )

  const funcoesDe = (pessoaId) =>
    db.membro_funcoes
      .filter((mf) => mf.pessoa_id === pessoaId)
      .map((mf) => db.funcoes.find((f) => f.id === mf.funcao_id))
      .filter(Boolean)

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className={estiloInput}
          placeholder="Buscar pessoa…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <Botao onClick={() => setEditando({})} className="shrink-0">+ Nova</Botao>
      </div>

      {pessoas.length === 0 && <Vazio>Nenhuma pessoa cadastrada ainda. Toque em “+ Nova”.</Vazio>}

      <ul className="space-y-2">
        {pessoas.map((p) => {
          const fns = funcoesDe(p.id)
          const nIndisp = db.indisponibilidades.filter((i) => i.pessoa_id === p.id && i.data >= hojeISO()).length
          return (
            <li key={p.id} className={`rounded-2xl bg-white p-3 shadow-sm ${p.ativo ? '' : 'opacity-60'}`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">
                    {p.nome}
                    {!p.ativo && <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">INATIVO</span>}
                  </div>
                  {p.telefone && <div className="text-xs text-slate-500">{p.telefone}</div>}
                </div>
                <button className="text-sm font-semibold text-indigo-600" onClick={() => setEditando({ pessoa: p })}>
                  Editar
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {fns.map((f) => {
                  const dep = db.departamentos.find((d) => d.id === f.departamento_id)
                  return (
                    <span key={f.id} className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ backgroundColor: dep?.cor || '#64748b' }}>
                      {f.nome}
                    </span>
                  )
                })}
                {fns.length === 0 && <span className="text-xs text-slate-400">Sem funções vinculadas</span>}
              </div>
              <div className="mt-2 flex gap-4 text-xs font-semibold">
                <button className="text-indigo-600" onClick={() => setVinculando(p)}>🔗 Funções</button>
                <button className="text-amber-600" onClick={() => setIndisp(p)}>
                  🚫 Indisponibilidades{nIndisp > 0 && ` (${nIndisp})`}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {editando && (
        <ModalPessoa
          pessoa={editando.pessoa}
          onFechar={() => setEditando(null)}
          onSalvar={async (dados) => {
            if (editando.pessoa) await acoes.updatePessoa(editando.pessoa.id, dados)
            else await acoes.createPessoa(dados)
            setEditando(null)
          }}
          onExcluir={
            editando.pessoa &&
            (async () => {
              if (confirm(`Excluir ${editando.pessoa.nome}? As escalas em que ela aparece ficarão com a vaga em aberto.`)) {
                await acoes.deletePessoa(editando.pessoa.id)
                setEditando(null)
              }
            })
          }
        />
      )}

      {vinculando && <ModalFuncoes pessoa={vinculando} onFechar={() => setVinculando(null)} />}
      {indisp && <ModalIndisponibilidades pessoa={indisp} onFechar={() => setIndisp(null)} />}
    </div>
  )
}

function ModalPessoa({ pessoa, onFechar, onSalvar, onExcluir }) {
  const [nome, setNome] = useState(pessoa?.nome || '')
  const [telefone, setTelefone] = useState(pessoa?.telefone || '')
  const [ativo, setAtivo] = useState(pessoa ? pessoa.ativo : true)

  return (
    <Modal titulo={pessoa ? 'Editar pessoa' : 'Nova pessoa'} aberto onFechar={onFechar}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (nome.trim()) onSalvar({ nome: nome.trim(), telefone: telefone.trim(), ativo })
        }}
      >
        <Campo rotulo="Nome *">
          <input className={estiloInput} value={nome} onChange={(e) => setNome(e.target.value)} autoFocus required />
        </Campo>
        <Campo rotulo="Telefone">
          <input className={estiloInput} value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" inputMode="tel" />
        </Campo>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" className="h-5 w-5 accent-indigo-600" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Ativo (aparece nas escalas e sorteios)
        </label>
        <div className="flex gap-2 pt-2">
          <Botao type="submit" className="flex-1">Salvar</Botao>
          {onExcluir && <Botao type="button" variante="perigo" onClick={onExcluir}>Excluir</Botao>}
        </div>
      </form>
    </Modal>
  )
}

// Vincular pessoa ↔ funções: checkboxes agrupados por departamento.
function ModalFuncoes({ pessoa, onFechar }) {
  const { db, acoes } = useData()
  const [selecionadas, setSelecionadas] = useState(
    () => new Set(db.membro_funcoes.filter((mf) => mf.pessoa_id === pessoa.id).map((mf) => mf.funcao_id))
  )

  const alternar = (id) => {
    const s = new Set(selecionadas)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelecionadas(s)
  }

  return (
    <Modal titulo={`Funções de ${pessoa.nome}`} aberto onFechar={onFechar}>
      <div className="space-y-4">
        {db.departamentos.length === 0 && (
          <p className="text-sm text-slate-500">Cadastre departamentos e funções primeiro (aba “Deptos”).</p>
        )}
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
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-indigo-600"
                      checked={selecionadas.has(f.id)}
                      onChange={() => alternar(f.id)}
                    />
                    {f.nome}
                  </label>
                ))}
              </div>
            </div>
          )
        })}
        <Botao
          className="w-full"
          onClick={async () => {
            await acoes.setMembroFuncoes(pessoa.id, [...selecionadas])
            onFechar()
          }}
        >
          Salvar funções
        </Botao>
      </div>
    </Modal>
  )
}

function ModalIndisponibilidades({ pessoa, onFechar }) {
  const { db, acoes } = useData()
  const [data, setData] = useState('')
  const datas = db.indisponibilidades
    .filter((i) => i.pessoa_id === pessoa.id)
    .map((i) => i.data)
    .sort()

  return (
    <Modal titulo={`Indisponibilidades de ${pessoa.nome}`} aberto onFechar={onFechar}>
      <div className="space-y-3">
        <p className="text-sm text-slate-500">Datas em que a pessoa não pode servir. Ela não aparecerá nas escalas dessas datas.</p>
        <div className="flex gap-2">
          <input type="date" className={estiloInput} value={data} onChange={(e) => setData(e.target.value)} />
          <Botao
            className="shrink-0"
            disabled={!data}
            onClick={async () => {
              await acoes.addIndisponibilidade(pessoa.id, data)
              setData('')
            }}
          >
            Adicionar
          </Botao>
        </div>
        {datas.length === 0 && <p className="text-center text-sm text-slate-400">Nenhuma data cadastrada.</p>}
        <ul className="space-y-1.5">
          {datas.map((d) => (
            <li key={d} className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-sm">
              <span className={d < hojeISO() ? 'text-slate-400 line-through' : 'font-medium text-amber-800'}>
                🚫 {formatarDataBR(d)}
              </span>
              <button className="font-bold text-red-500" onClick={() => acoes.removeIndisponibilidade(pessoa.id, d)}>
                Remover
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}
