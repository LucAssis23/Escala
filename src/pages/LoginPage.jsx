import { useState } from 'react'
import { useData } from '../data/DataContext'
import { Botao, Campo, estiloInput } from '../components/ui'

// Tela de login (modo Supabase). Os acessos são criados pelo administrador
// no painel do Supabase (Authentication → Users → Add user).
export default function LoginPage() {
  const { entrar } = useData()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [entrando, setEntrando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    if (!email || !senha || entrando) return
    setEntrando(true)
    setErro('')
    try {
      await entrar(email.trim(), senha)
    } catch (err) {
      setErro(err.message)
    } finally {
      setEntrando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="text-4xl">⛪</div>
          <h1 className="mt-2 text-xl font-extrabold text-slate-800">Escala da Igreja</h1>
          <p className="mt-1 text-sm text-slate-500">Entre com o acesso da sua equipe</p>
        </div>

        <form className="space-y-3" onSubmit={enviar}>
          <Campo rotulo="E-mail">
            <input
              type="email"
              className={estiloInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              autoComplete="email"
              required
            />
          </Campo>
          <Campo rotulo="Senha">
            <input
              type="password"
              className={estiloInput}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </Campo>

          {erro && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>
          )}

          <Botao type="submit" className="w-full" disabled={entrando}>
            {entrando ? 'Entrando…' : 'Entrar'}
          </Botao>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Sem acesso? Peça ao administrador da escala para criar seu usuário.
        </p>
      </div>
    </div>
  )
}
