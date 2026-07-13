import { useState } from 'react'
import { useData } from '../data/DataContext'
import { Botao, Campo, estiloInput } from '../components/ui'

// Tela aberta pelo link "redefinir senha" do e-mail: o Supabase loga o
// usuário numa sessão de recuperação e aqui ele define a senha nova.
export default function NovaSenhaPage() {
  const { novaSenha, terminarRecuperacao } = useData()
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [pronto, setPronto] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    if (enviando) return
    setErro('')
    if (senha !== confirmar) {
      setErro('As senhas não conferem — digite a mesma senha nos dois campos.')
      return
    }
    setEnviando(true)
    try {
      await novaSenha(senha)
      setPronto(true)
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
          <div className="text-4xl">🔑</div>
          <h1 className="mt-2 text-xl font-extrabold tracking-tight text-slate-800">
            {pronto ? 'Senha alterada!' : 'Criar senha nova'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {pronto ? 'Tudo certo — pode usar o app normalmente.' : 'Escolha a nova senha da sua conta.'}
          </p>
        </div>

        {pronto ? (
          <Botao className="w-full" onClick={terminarRecuperacao}>
            Ir para o app
          </Botao>
        ) : (
          <form className="space-y-3" onSubmit={enviar}>
            <Campo rotulo="Senha nova">
              <input
                type="password"
                className={estiloInput}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                autoComplete="new-password"
                minLength={6}
                autoFocus
                required
              />
            </Campo>
            <Campo rotulo="Repita a senha">
              <input
                type="password"
                className={estiloInput}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                placeholder="Digite de novo"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </Campo>

            {erro && (
              <div className="anim-fade-in rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {erro}
              </div>
            )}

            <Botao type="submit" className="w-full" disabled={enviando}>
              {enviando ? 'Aguarde…' : 'Salvar senha nova'}
            </Botao>
          </form>
        )}
      </div>
    </div>
  )
}
