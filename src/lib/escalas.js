// Regras de negócio das escalas: elegibilidade, rodízio justo e sorteio.
import { addDias } from './datas'

// Pessoas aptas a uma função em uma data: têm a função, estão ativas e
// não estão indisponíveis na data. `manterPessoaId` mantém no dropdown a
// pessoa já atribuída (mesmo que tenha ficado inativa/indisponível depois).
export function pessoasElegiveis(db, funcaoId, data, manterPessoaId = null) {
  const indisponiveis = new Set(
    db.indisponibilidades.filter((i) => i.data === data).map((i) => i.pessoa_id)
  )
  const temFuncao = new Set(
    db.membro_funcoes.filter((mf) => mf.funcao_id === funcaoId).map((mf) => mf.pessoa_id)
  )
  return db.pessoas
    .filter((p) => {
      if (p.id === manterPessoaId) return true
      return p.ativo && temFuncao.has(p.id) && !indisponiveis.has(p.id)
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

// Quantas vezes cada pessoa serviu nos últimos 60 dias antes da data de
// referência (inclusive), ignorando a própria escala sendo editada.
export function contagem60Dias(db, dataRef, escalaIdIgnorar = null) {
  const inicio = addDias(dataRef, -60)
  const escalasNoPeriodo = new Set(
    db.escalas
      .filter((e) => e.id !== escalaIdIgnorar && e.data >= inicio && e.data <= dataRef)
      .map((e) => e.id)
  )
  const contagem = new Map()
  for (const item of db.escala_itens) {
    if (item.pessoa_id && escalasNoPeriodo.has(item.escala_id)) {
      contagem.set(item.pessoa_id, (contagem.get(item.pessoa_id) || 0) + 1)
    }
  }
  return contagem
}

function embaralhar(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Sorteia pessoas para os itens em aberto de uma escala.
// Regras:
//  - nunca escala pessoa indisponível na data (via pessoasElegiveis);
//  - por padrão não repete pessoa na mesma escala; com permitirAcumulo=true
//    repete apenas quando não há ninguém livre;
//  - rodízio justo: prioriza quem serviu menos nos últimos 60 dias
//    (empates decididos aleatoriamente);
//  - sem candidato → item fica em aberto (pessoa_id null).
// Retorna [{ id, pessoa_id }] apenas para os itens que estavam vazios.
export function sortearVagas({ db, escala, itens, permitirAcumulo }) {
  const contagem = contagem60Dias(db, escala.data, escala.id)
  const usados = new Map() // pessoa_id -> quantas vezes já está nesta escala
  for (const item of itens) {
    if (item.pessoa_id) usados.set(item.pessoa_id, (usados.get(item.pessoa_id) || 0) + 1)
  }

  const resultado = []
  for (const item of embaralhar(itens.filter((i) => !i.pessoa_id))) {
    const candidatos = pessoasElegiveis(db, item.funcao_id, escala.data)
    const livres = candidatos.filter((p) => !usados.has(p.id))
    const pool = livres.length ? livres : permitirAcumulo ? candidatos : []

    let escolhido = null
    if (pool.length) {
      // menor (nº de acúmulos nesta escala, serviços em 60 dias) vence; empate = aleatório
      const ordenado = embaralhar(pool).sort((a, b) => {
        const acA = usados.get(a.id) || 0
        const acB = usados.get(b.id) || 0
        if (acA !== acB) return acA - acB
        return (contagem.get(a.id) || 0) - (contagem.get(b.id) || 0)
      })
      escolhido = ordenado[0]
      usados.set(escolhido.id, (usados.get(escolhido.id) || 0) + 1)
      contagem.set(escolhido.id, (contagem.get(escolhido.id) || 0) + 1)
    }
    resultado.push({ id: item.id, pessoa_id: escolhido ? escolhido.id : null })
  }
  return resultado
}

// Conjunto de pessoa_ids que aparecem em mais de um item da escala (acúmulo).
export function pessoasDuplicadas(itens) {
  const vistos = new Set()
  const dup = new Set()
  for (const i of itens) {
    if (!i.pessoa_id) continue
    if (vistos.has(i.pessoa_id)) dup.add(i.pessoa_id)
    vistos.add(i.pessoa_id)
  }
  return dup
}
