import { useState } from 'react'
import { useData } from '../data/DataContext'
import { Botao, Campo, estiloInput } from '../components/ui'

// Entrar ou criar conta (modo Supabase). O cadastro usa o código de convite
// da igreja e a conta fica aguardando aprovação de um líder.
export default function LoginPage() {
  const { entrar, cadastrar } = useData()
  const [modo, setModo] = useState('entrar') // 'entrar' | 'cadastrar'
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const trocarModo = (novo) => {
    setModo(novo)
    setErro('')
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (enviando) return
    setEnviando(true)
    setErro('')
    try {
      if (modo === 'entrar') {
        await entrar(email.trim(), senha)
      } else {
        await cadastrar(nome.trim(), email.trim(), senha, codigo)
        // sucesso: o App detecta o usuário logado sem aprovação e
        // mostra a tela "aguardando aprovação" automaticamente
      }
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-4">
      <div className="anim-scale-in w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mb-5 text-center">
          <div className="text-4xl">⛪</div>
          <h1 className="mt-2 text-xl font-extrabold tracking-tight text-slate-800">Escala da Igreja</h1>
          <p className="mt-1 text-sm text-slate-500">
            {modo === 'entrar' ? 'Entre com o acesso da sua equipe' : 'Crie sua conta com o código da sua igreja'}
          </p>
        </div>

        {/* abas Entrar / Criar conta */}
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
          {[
            { id: 'entrar', rotulo: 'Entrar' },
            { id: 'cadastrar', rotulo: 'Criar conta' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => trocarModo(t.id)}
              className={`rounded-xl py-2 text-sm font-semibold transition-all ${
                modo === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              {t.rotulo}
            </button>
          ))}
        </div>

        <form key={modo} className="anim-fade-in space-y-3" onSubmit={enviar}>
          {modo === 'cadastrar' && (
            <Campo rotulo="Seu nome">
              <input
                className={estiloInput}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Maria da Silva"
                autoComplete="name"
                required
              />
            </Campo>
          )}
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
              placeholder={modo === 'cadastrar' ? 'Mínimo de 6 caracteres' : '••••••••'}
              autoComplete={modo === 'cadastrar' ? 'new-password' : 'current-password'}
              minLength={modo === 'cadastrar' ? 6 : undefined}
              required
            />
          </Campo>
          {modo === 'cadastrar' && (
            <Campo rotulo="Código da igreja">
              <input
                className={`${estiloInput} uppercase`}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ex.: IGREJA1"
                required
              />
            </Campo>
          )}

          {erro && (
            <div className="anim-fade-in rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </div>
          )}

          <Botao type="submit" className="w-full" disabled={enviando}>
            {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
          </Botao>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          {modo === 'entrar'
            ? 'Primeira vez? Toque em "Criar conta" e use o código da sua igreja.'
            : 'Após criar a conta, um líder da igreja aprova o seu acesso.'}
        </p>
      </div>
    </div>
  )
}
