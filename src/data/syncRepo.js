// Modo híbrido: Supabase (sincronizado via web) + cache local.
// Toda leitura bem-sucedida do Supabase é guardada no localStorage;
// se a rede falhar, o app abre com a última versão sincronizada
// (marcando repo.offline = true para a interface avisar).
const CHAVE_CACHE = 'escala-igreja-cache-v1'

export function criarSyncRepo(remoto) {
  const repo = {
    ...remoto,
    nome: 'supabase',
    offline: false,

    async loadAll() {
      try {
        const db = await remoto.loadAll()
        repo.offline = false
        try {
          localStorage.setItem(CHAVE_CACHE, JSON.stringify(db))
        } catch {
          // cache cheio/indisponível não impede o uso online
        }
        return db
      } catch (e) {
        const cache = localStorage.getItem(CHAVE_CACHE)
        if (cache) {
          repo.offline = true
          return JSON.parse(cache)
        }
        throw e
      }
    },
  }
  return repo
}
