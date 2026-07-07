// Implementação do repositório usando localStorage.
// Mesma interface do supabaseRepo — trocar um pelo outro não exige mudar telas.

const CHAVE = 'escala-igreja-db-v1'

const VAZIO = {
  pessoas: [],
  departamentos: [],
  funcoes: [],
  membro_funcoes: [],
  indisponibilidades: [],
  escalas: [],
  escala_itens: [],
}

function ler() {
  try {
    const raw = localStorage.getItem(CHAVE)
    return raw ? { ...VAZIO, ...JSON.parse(raw) } : { ...VAZIO }
  } catch {
    return { ...VAZIO }
  }
}

function gravar(db) {
  localStorage.setItem(CHAVE, JSON.stringify(db))
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)
}

export const localRepo = {
  nome: 'localStorage',

  async loadAll() {
    return ler()
  },

  // ---- pessoas ----
  async createPessoa({ nome, telefone, ativo = true }) {
    const db = ler()
    const p = { id: uid(), nome, telefone: telefone || '', ativo }
    db.pessoas.push(p)
    gravar(db)
    return p
  },
  async updatePessoa(id, patch) {
    const db = ler()
    const p = db.pessoas.find((x) => x.id === id)
    if (p) Object.assign(p, patch)
    gravar(db)
  },
  async deletePessoa(id) {
    const db = ler()
    db.pessoas = db.pessoas.filter((x) => x.id !== id)
    db.membro_funcoes = db.membro_funcoes.filter((x) => x.pessoa_id !== id)
    db.indisponibilidades = db.indisponibilidades.filter((x) => x.pessoa_id !== id)
    db.escala_itens = db.escala_itens.map((x) => (x.pessoa_id === id ? { ...x, pessoa_id: null } : x))
    gravar(db)
  },

  // ---- departamentos ----
  async createDepartamento({ nome, cor }) {
    const db = ler()
    const d = { id: uid(), nome, cor }
    db.departamentos.push(d)
    gravar(db)
    return d
  },
  async updateDepartamento(id, patch) {
    const db = ler()
    const d = db.departamentos.find((x) => x.id === id)
    if (d) Object.assign(d, patch)
    gravar(db)
  },
  async deleteDepartamento(id) {
    const db = ler()
    const funcIds = db.funcoes.filter((f) => f.departamento_id === id).map((f) => f.id)
    db.departamentos = db.departamentos.filter((x) => x.id !== id)
    db.funcoes = db.funcoes.filter((f) => f.departamento_id !== id)
    db.membro_funcoes = db.membro_funcoes.filter((mf) => !funcIds.includes(mf.funcao_id))
    db.escala_itens = db.escala_itens.filter((i) => !funcIds.includes(i.funcao_id))
    gravar(db)
  },

  // ---- funções ----
  async createFuncao({ departamento_id, nome }) {
    const db = ler()
    const f = { id: uid(), departamento_id, nome }
    db.funcoes.push(f)
    gravar(db)
    return f
  },
  async updateFuncao(id, patch) {
    const db = ler()
    const f = db.funcoes.find((x) => x.id === id)
    if (f) Object.assign(f, patch)
    gravar(db)
  },
  async deleteFuncao(id) {
    const db = ler()
    db.funcoes = db.funcoes.filter((x) => x.id !== id)
    db.membro_funcoes = db.membro_funcoes.filter((x) => x.funcao_id !== id)
    db.escala_itens = db.escala_itens.filter((x) => x.funcao_id !== id)
    gravar(db)
  },

  // ---- vínculo pessoa ↔ funções ----
  async setMembroFuncoes(pessoa_id, funcaoIds) {
    const db = ler()
    db.membro_funcoes = db.membro_funcoes.filter((x) => x.pessoa_id !== pessoa_id)
    for (const funcao_id of funcaoIds) db.membro_funcoes.push({ pessoa_id, funcao_id })
    gravar(db)
  },

  // ---- indisponibilidades ----
  async addIndisponibilidade(pessoa_id, data) {
    const db = ler()
    if (!db.indisponibilidades.some((x) => x.pessoa_id === pessoa_id && x.data === data)) {
      db.indisponibilidades.push({ pessoa_id, data })
    }
    gravar(db)
  },
  async removeIndisponibilidade(pessoa_id, data) {
    const db = ler()
    db.indisponibilidades = db.indisponibilidades.filter((x) => !(x.pessoa_id === pessoa_id && x.data === data))
    gravar(db)
  },

  // ---- escalas ----
  async createEscala({ data, titulo }) {
    const db = ler()
    const e = { id: uid(), data, titulo }
    db.escalas.push(e)
    gravar(db)
    return e
  },
  async updateEscala(id, patch) {
    const db = ler()
    const e = db.escalas.find((x) => x.id === id)
    if (e) Object.assign(e, patch)
    gravar(db)
  },
  async deleteEscala(id) {
    const db = ler()
    db.escalas = db.escalas.filter((x) => x.id !== id)
    db.escala_itens = db.escala_itens.filter((x) => x.escala_id !== id)
    gravar(db)
  },

  // ---- itens da escala ----
  async addEscalaItem(escala_id, funcao_id) {
    const db = ler()
    const i = { id: uid(), escala_id, funcao_id, pessoa_id: null }
    db.escala_itens.push(i)
    gravar(db)
    return i
  },
  async removeEscalaItem(id) {
    const db = ler()
    db.escala_itens = db.escala_itens.filter((x) => x.id !== id)
    gravar(db)
  },
  async setEscalaItemPessoa(id, pessoa_id) {
    const db = ler()
    const i = db.escala_itens.find((x) => x.id === id)
    if (i) i.pessoa_id = pessoa_id
    gravar(db)
  },
  async setEscalaItensPessoas(atribuicoes) {
    // atribuicoes: [{ id, pessoa_id }]
    const db = ler()
    for (const { id, pessoa_id } of atribuicoes) {
      const i = db.escala_itens.find((x) => x.id === id)
      if (i) i.pessoa_id = pessoa_id
    }
    gravar(db)
  },
}
