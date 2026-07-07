# ⛪ Escala da Igreja

Aplicativo web (mobile-first, pt-BR) para gestão de escalas de voluntários da igreja: pessoas, departamentos, funções, indisponibilidades, sorteio com rodízio justo, calendário mensal e texto pronto para o WhatsApp.

**Stack:** React + Vite + Tailwind CSS v4. Dados via *repository pattern*: funciona de imediato com **localStorage** e, ao definir duas variáveis de ambiente, passa a usar o **Supabase** — sem mudar nenhuma linha de código.

## Funcionalidades

- CRUD de pessoas, departamentos (com cor) e funções.
- Vínculo pessoa ↔ funções com checkboxes agrupados por departamento (muitos-para-muitos em dois níveis).
- Indisponibilidades por pessoa e data.
- Criação de escala escolhendo data, título e funções a preencher.
- Preenchimento **manual**: cada dropdown lista só quem tem a função e está disponível na data.
- Preenchimento por **sorteio**: nunca escala indisponível; não repete pessoa na escala (toggle "permitir acúmulo" com badge amarelo de aviso); rodízio justo priorizando quem serviu menos nos últimos 60 dias; vaga sem candidato fica **em aberto** com destaque vermelho.
- Edição manual de qualquer posição após o sorteio.
- Calendário mensal com as escalas.
- Botão "📲 Copiar p/ WhatsApp" com texto formatado (emoji, data, departamento, função — pessoa).
- Tela "Carga": ranking mensal de quantas vezes cada pessoa serviu.

## Como rodar localmente

Pré-requisito: Node.js 18+.

```bash
npm install
npm run dev
```

Abra http://localhost:5173. Sem configurar nada, os dados ficam no **localStorage** do navegador (o selo "Local" aparece no topo) — ideal para testar.

## Como plugar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (plano gratuito).
2. No **SQL Editor**, cole e execute o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
3. Em **Project Settings → API**, copie a *Project URL* e a *anon public key*.
4. Crie um arquivo `.env` na raiz (baseado no `.env.example`):

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

5. Reinicie o `npm run dev`. O selo no topo muda para "Supabase" e todos os dados passam a ser salvos lá.

> As políticas de RLS do `schema.sql` são permissivas (qualquer pessoa com o link acessa tudo), o que é adequado para um app interno de igreja sem login. O próprio arquivo indica como restringir quando você quiser adicionar autenticação.

## Deploy gratuito na Vercel

1. Suba o projeto para o GitHub (este repositório).
2. Acesse [vercel.com](https://vercel.com), faça login com o GitHub e clique em **Add New → Project**.
3. Importe o repositório. A Vercel detecta o Vite automaticamente (build `npm run build`, saída `dist`) — não precisa mudar nada.
4. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (se for usar Supabase; sem elas o site publicado usa localStorage, com dados separados por aparelho).
5. Clique em **Deploy**. Pronto — você recebe uma URL `https://seu-projeto.vercel.app` para compartilhar com a equipe.

Para atualizar o site, basta dar `git push`: a Vercel refaz o deploy automaticamente.

## Estrutura do projeto

```
src/
  data/
    repo.js            # escolhe o backend (Supabase se houver env, senão localStorage)
    localRepo.js       # implementação localStorage
    supabaseRepo.js    # implementação Supabase (mesma interface)
    DataContext.jsx    # estado global + ações (executa no repo e recarrega)
  lib/
    datas.js           # utilitários de data (sempre 'YYYY-MM-DD', sem bug de fuso)
    escalas.js         # elegibilidade, contagem 60 dias, sorteio, detecção de acúmulo
    whatsapp.js        # gerador do texto formatado + cópia p/ área de transferência
  components/ui.jsx    # botão, modal, campo, toast, cores de departamento
  pages/
    EscalasPage.jsx    # lista, criação, detalhe, sorteio, WhatsApp
    CalendarioPage.jsx # calendário mensal
    PessoasPage.jsx    # CRUD + vínculo de funções + indisponibilidades
    DepartamentosPage.jsx # CRUD de departamentos e funções
    CargaPage.jsx      # ranking mensal de serviços
supabase/schema.sql    # tabelas + índices + RLS para o SQL Editor
```
