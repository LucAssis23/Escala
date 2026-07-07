import { formatarDataLonga } from './datas'

// Gera o texto formatado da escala para colar no WhatsApp.
export function textoWhatsApp({ escala, itens, db }) {
  const linhas = [`📅 *${escala.titulo}*`, `🗓️ ${formatarDataLonga(escala.data)}`, '']

  const porDepartamento = new Map()
  for (const item of itens) {
    const funcao = db.funcoes.find((f) => f.id === item.funcao_id)
    if (!funcao) continue
    const dep = db.departamentos.find((d) => d.id === funcao.departamento_id)
    const chave = dep ? dep.id : '_'
    if (!porDepartamento.has(chave)) porDepartamento.set(chave, { dep, linhas: [] })
    const pessoa = db.pessoas.find((p) => p.id === item.pessoa_id)
    porDepartamento.get(chave).linhas.push(
      `• ${funcao.nome} — ${pessoa ? pessoa.nome : '_em aberto_'}`
    )
  }

  for (const { dep, linhas: ls } of porDepartamento.values()) {
    linhas.push(`👥 *${dep ? dep.nome : 'Outros'}*`)
    linhas.push(...ls, '')
  }

  linhas.push('🙏 Deus abençoe o seu servir!')
  return linhas.join('\n')
}

export async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto)
    return true
  } catch {
    // fallback para contextos sem clipboard API (http, webviews antigos)
    const ta = document.createElement('textarea')
    ta.value = texto
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  }
}
