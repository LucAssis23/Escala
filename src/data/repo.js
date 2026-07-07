// Ponto único de escolha do backend de dados.
// Com VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY definidos → Supabase.
// Sem eles → localStorage (funciona offline, ótimo para testar).
import { localRepo } from './localRepo'
import { criarSupabaseRepo } from './supabaseRepo'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const repo = url && key ? criarSupabaseRepo(url, key) : localRepo
