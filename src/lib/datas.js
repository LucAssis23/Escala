// Utilitários de data. Datas circulam no app sempre como string 'YYYY-MM-DD'
// para evitar bugs de fuso horário.

export function hojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function parseISO(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

export function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function addDias(iso, dias) {
  const d = parseISO(iso)
  d.setDate(d.getDate() + dias)
  return toISO(d)
}

const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const DIAS_SEMANA_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export function formatarDataBR(iso) {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

export function formatarDataLonga(iso) {
  const d = parseISO(iso)
  return `${DIAS_SEMANA[d.getDay()]}, ${formatarDataBR(iso)}`
}

export function diaSemanaCurto(iso) {
  return DIAS_SEMANA_CURTO[parseISO(iso).getDay()]
}

export function mesmoMes(iso, ano, mes /* 1-12 */) {
  const [a, m] = iso.split('-').map(Number)
  return a === ano && m === mes
}

// Todas as datas de um mês que caem nos dias da semana escolhidos (0=dom … 6=sáb).
export function datasDoMes(ano, mes /* 1-12 */, diasSemana /* array de 0-6 */) {
  const datas = []
  const d = new Date(ano, mes - 1, 1)
  while (d.getMonth() === mes - 1) {
    if (diasSemana.includes(d.getDay())) datas.push(toISO(d))
    d.setDate(d.getDate() + 1)
  }
  return datas
}

export const DIAS_SEMANA_CHIPS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
