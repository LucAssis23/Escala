// Gera uma imagem PNG da escala (para compartilhar em grupos) desenhando
// direto num <canvas>, sem depender de bibliotecas externas.
import { formatarDataLonga } from './datas'

function truncar(ctx, texto, maxLargura) {
  if (ctx.measureText(texto).width <= maxLargura) return texto
  let t = texto
  while (t.length > 1 && ctx.measureText(t + '…').width > maxLargura) t = t.slice(0, -1)
  return t + '…'
}

export async function gerarImagemEscala({ escala, itens, db, nomeIgreja }) {
  const porDepartamento = new Map()
  for (const item of itens) {
    const funcao = db.funcoes.find((f) => f.id === item.funcao_id)
    if (!funcao) continue
    const dep = db.departamentos.find((d) => d.id === funcao.departamento_id)
    const chave = dep ? dep.id : '_'
    if (!porDepartamento.has(chave)) porDepartamento.set(chave, { dep, linhas: [] })
    const pessoa = db.pessoas.find((p) => p.id === item.pessoa_id)
    porDepartamento.get(chave).linhas.push({ funcao: funcao.nome, pessoa: pessoa?.nome || null })
  }

  const largura = 720
  const paddingX = 40
  const linhaAltura = 34
  const depCabecalhoAltura = 44
  const cabecalhoAltura = nomeIgreja ? 150 : 120

  let altura = cabecalhoAltura + 30
  for (const { linhas } of porDepartamento.values()) {
    altura += depCabecalhoAltura + linhas.length * linhaAltura + 16
  }
  altura += 50

  const escalaPixel = 2 // retina, fica nítido ao ampliar no WhatsApp
  const canvas = document.createElement('canvas')
  canvas.width = largura * escalaPixel
  canvas.height = altura * escalaPixel
  const ctx = canvas.getContext('2d')
  ctx.scale(escalaPixel, escalaPixel)

  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, 0, largura, altura)

  const grad = ctx.createLinearGradient(0, 0, largura, 0)
  grad.addColorStop(0, '#4f46e5')
  grad.addColorStop(1, '#7c3aed')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, largura, cabecalhoAltura)

  ctx.fillStyle = '#ffffff'
  if (nomeIgreja) {
    ctx.font = '600 16px system-ui, -apple-system, sans-serif'
    ctx.fillText(`⛪ ${nomeIgreja}`, paddingX, 36)
  }
  ctx.font = '800 28px system-ui, -apple-system, sans-serif'
  ctx.fillText(truncar(ctx, escala.titulo, largura - paddingX * 2), paddingX, nomeIgreja ? 78 : 54)

  ctx.font = '500 17px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  const dataTexto = formatarDataLonga(escala.data)
  ctx.fillText(dataTexto.charAt(0).toUpperCase() + dataTexto.slice(1), paddingX, nomeIgreja ? 108 : 88)

  let y = cabecalhoAltura + 36
  for (const { dep, linhas } of porDepartamento.values()) {
    const cor = dep?.cor || '#64748b'
    ctx.fillStyle = cor
    ctx.fillRect(paddingX, y - 26, largura - paddingX * 2, depCabecalhoAltura)
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 17px system-ui, -apple-system, sans-serif'
    ctx.fillText(truncar(ctx, dep ? dep.nome : 'Outros', largura - paddingX * 2 - 28), paddingX + 14, y + 3)
    y += depCabecalhoAltura + 8

    for (const { funcao, pessoa } of linhas) {
      ctx.font = '600 16px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#1e293b'
      ctx.fillText(truncar(ctx, funcao, 260), paddingX + 14, y)

      ctx.font = '500 16px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = pessoa ? '#4338ca' : '#dc2626'
      const texto = truncar(ctx, pessoa || 'em aberto', 300)
      const largTexto = ctx.measureText(texto).width
      ctx.fillText(texto, largura - paddingX - 14 - largTexto, y)
      y += linhaAltura
    }
    y += 16
  }

  ctx.fillStyle = '#94a3b8'
  ctx.font = '500 13px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('🙏 Deus abençoe o seu servir!', largura / 2, altura - 24)
  ctx.textAlign = 'left'

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

// Tenta abrir o menu nativo de compartilhamento (ótimo pra mandar direto
// pro grupo do WhatsApp no celular); sem suporte, baixa o arquivo.
export async function compartilharOuBaixarImagem(blob, nomeArquivo) {
  const file = new File([blob], nomeArquivo, { type: 'image/png' })
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'compartilhado'
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelado'
      // qualquer outro erro: cai no download abaixo
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return 'baixado'
}
