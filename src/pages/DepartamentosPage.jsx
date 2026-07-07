import { useState } from 'react'
import { useData } from '../data/DataContext'
import { Botao, Campo, Modal, Vazio, estiloInput, CORES_DEPARTAMENTO } from '../components/ui'

export default function DepartamentosPage() {
  const { db, acoes } = useData()
  const [editando, setEditando] = useState(null) // null | {} | { dep }
  const [novaFuncao, setNovaFuncao] = useState({}) // depId -> texto

  const adicionarFuncao = async (depId) => {
    const nome = (novaFuncao[depId] || '').trim()
    if (!nome) return
    await acoes.createFuncao({ departamento_id: depId, nome })
    setNovaFuncao((s) => ({ ...s, [depId]: '' }))
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Botao onClick={() => setEditando({})}>+ Novo departamento</Botao>
      </div>

      {db.departamentos.length === 0 && (
        <Vazio>
          Nenhum departamento ainda.
          <br />
          Ex.: Louvor, Mídia, Recepção, Infantil…
        </Vazio>
      )}

      {db.departamentos.map((dep) => {
        const funcoes = db.funcoes.filter((f) => f.departamento_id === dep.id)
        return (
          <div key={dep.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between px-3 py-2.5 text-white" style={{ backgroundColor: dep.cor }}>
              <span className="font-bold">{dep.nome}</span>
              <button className="rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold" onClick={() => setEditando({ dep })}>
                Editar
              </button>
            </div>
            <div className="space-y-2 p-3">
              {funcoes.length === 0 && <p className="text-sm text-slate-400">Nenhuma função. Ex.: violão, baixo, vocal…</p>}
              <ul className="space-y-1.5">
                {funcoes.map((f) => (
                  <li key={f.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-medium">{f.nome}</span>
                    <div className="flex gap-3 text-xs font-semibold">
                      <span className="text-slate-400">
                        {db.membro_funcoes.filter((mf) => mf.funcao_id === f.id).length} pessoa(s)
                      </span>
                      <button
                        className="text-red-500"
                        onClick={() => {
                          if (confirm(`Excluir a função "${f.nome}"? Vínculos e itens de escala dela serão removidos.`))
                            acoes.deleteFuncao(f.id)
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  adicionarFuncao(dep.id)
                }}
              >
                <input
                  className={estiloInput}
                  placeholder="Nova função…"
                  value={novaFuncao[dep.id] || ''}
                  onChange={(e) => setNovaFuncao((s) => ({ ...s, [dep.id]: e.target.value }))}
                />
                <Botao type="submit" variante="secundario" className="shrink-0">+</Botao>
              </form>
            </div>
          </div>
        )
      })}

      {editando && (
        <ModalDepartamento
          dep={editando.dep}
          onFechar={() => setEditando(null)}
          onSalvar={async (dados) => {
            if (editando.dep) await acoes.updateDepartamento(editando.dep.id, dados)
            else await acoes.createDepartamento(dados)
            setEditando(null)
          }}
          onExcluir={
            editando.dep &&
            (async () => {
              if (confirm(`Excluir "${editando.dep.nome}"? Todas as funções dele também serão excluídas.`)) {
                await acoes.deleteDepartamento(editando.dep.id)
                setEditando(null)
              }
            })
          }
        />
      )}
    </div>
  )
}

function ModalDepartamento({ dep, onFechar, onSalvar, onExcluir }) {
  const [nome, setNome] = useState(dep?.nome || '')
  const [cor, setCor] = useState(dep?.cor || CORES_DEPARTAMENTO[0])

  return (
    <Modal titulo={dep ? 'Editar departamento' : 'Novo departamento'} aberto onFechar={onFechar}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (nome.trim()) onSalvar({ nome: nome.trim(), cor })
        }}
      >
        <Campo rotulo="Nome *">
          <input className={estiloInput} value={nome} onChange={(e) => setNome(e.target.value)} autoFocus required placeholder="Ex.: Louvor" />
        </Campo>
        <Campo rotulo="Cor">
          <div className="flex flex-wrap gap-2">
            {CORES_DEPARTAMENTO.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCor(c)}
                className={`h-9 w-9 rounded-full border-4 ${cor === c ? 'border-slate-800' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
        </Campo>
        <div className="flex gap-2 pt-2">
          <Botao type="submit" className="flex-1">Salvar</Botao>
          {onExcluir && <Botao type="button" variante="perigo" onClick={onExcluir}>Excluir</Botao>}
        </div>
      </form>
    </Modal>
  )
}
