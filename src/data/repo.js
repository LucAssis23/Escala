// Ponto único de escolha do backend de dados.
// Com VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY definidos → modo híbrido:
// Supabase sincronizado via web + cache local para abrir sem internet.
// Sem eles → somente localStorage (dados ficam só no aparelho).
import { localRepo } from './localRepo'
import { criarSupabaseRepo } from './supabaseRepo'
import { criarSyncRepo } from './syncRepo'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const repo = url && key ? criarSyncRepo(criarSupabaseRepo(url, key)) : localRepo
