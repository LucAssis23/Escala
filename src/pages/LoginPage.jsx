import { useState } from 'react'
import { useData } from '../data/DataContext'
import { Botao, Campo, estiloInput } from '../components/ui'

// Entrar ou criar conta (modo Supabase). O cadastro usa o código de convite
// da igreja e a conta fica aguardando aprovação de um líder.
export default function LoginPage() {
  const { entrar, cadastrar, resetSenha } = useData()
  const [modo, setModo] = useState('entrar') // 'entrar' | 'cadastrar' | 'recuperar'
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [emailEnviado, setEmailEnviado] = useState(false)

  const trocarModo = (novo) => {
    setModo(novo)
    setErro('')
    setEmailEnviado(false)
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (enviando) return
    setEnviando(true)
    setErro('')
    try {
      if (modo === 'entrar') {
        await entrar(email.trim(), senha)
      } else if (modo === 'recuperar') {
        await resetSenha(email.trim())
        setEmailEnviado(true)
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
            {modo === 'entrar' && 'Entre com o acesso da sua equipe'}
            {modo === 'cadastrar' && 'Crie sua conta com o código da sua igreja'}
            {modo === 'recuperar' && 'Enviaremos um link para você criar uma senha nova'}
          </p>
        </div>

        {/* abas Entrar / Criar conta (ocultas na recuperação de senha) */}
        {modo !== 'recuperar' && (
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
        )}

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
          {modo !== 'recuperar' && (
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
          )}
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

          {emailEnviado && (
            <div className="anim-fade-in rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              📬 Link enviado! Confira seu e-mail (e a caixa de spam) e toque no link para criar a senha nova.
            </div>
          )}

          <Botao type="submit" className="w-full" disabled={enviando || (modo === 'recuperar' && emailEnviado)}>
            {enviando
              ? 'Aguarde…'
              : modo === 'entrar'
                ? 'Entrar'
                : modo === 'recuperar'
                  ? 'Enviar link de redefinição'
                  : 'Criar conta'}
          </Botao>
        </form>

        {modo === 'entrar' && (
          <button
            type="button"
            onClick={() => trocarModo('recuperar')}
            className="mt-3 w-full text-center text-sm font-semibold text-indigo-600"
          >
            Esqueci minha senha
          </button>
        )}
        {modo === 'recuperar' && (
          <button
            type="button"
            onClick={() => trocarModo('entrar')}
            className="mt-3 w-full text-center text-sm font-semibold text-slate-500"
          >
            ← Voltar para o login
          </button>
        )}

        <p className="mt-4 text-center text-xs text-slate-400">
          {modo === 'entrar' && 'Primeira vez? Toque em "Criar conta" e use o código da sua igreja.'}
          {modo === 'cadastrar' && 'Após criar a conta, um líder da igreja aprova o seu acesso.'}
          {modo === 'recuperar' && 'O link do e-mail abre o app direto na tela de senha nova.'}
        </p>
      </div>
    </div>
  )
}
