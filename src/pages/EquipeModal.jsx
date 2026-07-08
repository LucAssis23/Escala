import { useState } from 'react'
import { useData } from '../data/DataContext'
import { Modal, estiloInput } from '../components/ui'

const PAPEIS = [
  { id: 'membro', rotulo: 'Membro (só vê)' },
  { id: 'lider', rotulo: 'Líder de departamento' },
  { id: 'admin', rotulo: 'Administrador' },
]

// Equipe & acessos (só admin): aprovar cadastros, definir papéis e
// escolher quais departamentos cada líder comanda.
export default function EquipeModal({ onFechar }) {
  const { db, acoes, permissoes } = useData()

  const pendentes = db.perfis.filter((p) => !p.aprovado)
  const aprovados = db.perfis.filter((p) => p.aprovado)

  return (
    <Modal titulo="Equipe & acessos" aberto onFechar={onFechar}>
      <div className="space-y-4">
        {db.perfis.length <= 1 && (
          <p className="text-sm text-slate-500">
            Quando alguém criar conta com o código da sua igreja, o cadastro aparece aqui para você aprovar.
          </p>
        )}

        {pendentes.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-amber-600">
              ⏳ Aguardando aprovação ({pendentes.length})
            </h3>
            <ul className="space-y-2">
              {pendentes.map((p) => (
                <li key={p.user_id} className="anim-fade-in rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <div className="text-sm font-semibold">{p.nome}</div>
                  <div className="text-xs text-slate-500">{p.email}</div>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-all active:scale-[0.98]"
                      onClick={() => acoes.updatePerfil(p.user_id, { aprovado: true })}
                    >
                      ✓ Aprovar
                    </button>
                    <button
                      className="rounded-xl bg-red-100 px-3 py-2 text-xs font-bold text-red-600 transition-all active:scale-[0.98]"
                      onClick={() => {
                        if (confirm(`Recusar o cadastro de ${p.nome}?`)) acoes.deletePerfil(p.user_id)
                      }}
                    >
                      Recusar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
            Equipe ({aprovados.length})
          </h3>
          <ul className="space-y-2">
            {aprovados.map((p) => (
              <MembroEquipe key={p.user_id} perfil={p} euMesmo={p.user_id === permissoes.perfil?.user_id} />
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  )
}

function MembroEquipe({ perfil, euMesmo }) {
  const { db, acoes } = useData()
  const [salvando, setSalvando] = useState(false)
  const departamentosDele = db.lider_departamentos
    .filter((l) => l.user_id === perfil.user_id)
    .map((l) => l.departamento_id)

  const mudarPapel = async (papel) => {
    setSalvando(true)
    try {
      await acoes.updatePerfil(perfil.user_id, { papel })
      if (papel !== 'lider' && departamentosDele.length) {
        await acoes.setLiderDepartamentos(perfil.user_id, [])
      }
    } finally {
      setSalvando(false)
    }
  }

  const alternarDepartamento = async (depId) => {
    const novos = departamentosDele.includes(depId)
      ? departamentosDele.filter((d) => d !== depId)
      : [...departamentosDele, depId]
    await acoes.setLiderDepartamentos(perfil.user_id, novos)
  }

  return (
    <li className="rounded-2xl bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {perfil.nome}
            {euMesmo && <span className="ml-1.5 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-600">VOCÊ</span>}
          </div>
          <div className="truncate text-xs text-slate-500">{perfil.email}</div>
        </div>
        {!euMesmo && (
          <button
            className="shrink-0 text-xs font-semibold text-red-500"
            onClick={() => {
              if (confirm(`Remover o acesso de ${perfil.nome}?`)) acoes.deletePerfil(perfil.user_id)
            }}
          >
            Remover
          </button>
        )}
      </div>

      <select
        className={`${estiloInput} mt-2`}
        value={perfil.papel}
        disabled={euMesmo || salvando}
        onChange={(e) => mudarPapel(e.target.value)}
      >
        {PAPEIS.map((p) => (
          <option key={p.id} value={p.id}>{p.rotulo}</option>
        ))}
      </select>

      {perfil.papel === 'lider' && (
        <div className="mt-2">
          <p className="mb-1.5 text-xs font-medium text-slate-500">Departamentos que lidera:</p>
          <div className="flex flex-wrap gap-1.5">
            {db.departamentos.map((dep) => {
              const marcado = departamentosDele.includes(dep.id)
              return (
                <button
                  key={dep.id}
                  type="button"
                  onClick={() => alternarDepartamento(dep.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-all active:scale-95 ${
                    marcado ? '' : 'opacity-30'
                  }`}
                  style={{ backgroundColor: dep.cor }}
                >
                  {marcado ? '✓ ' : ''}{dep.nome}
                </button>
              )
            })}
            {db.departamentos.length === 0 && (
              <span className="text-xs text-slate-400">Cadastre departamentos primeiro.</span>
            )}
          </div>
        </div>
      )}
    </li>
  )
}
