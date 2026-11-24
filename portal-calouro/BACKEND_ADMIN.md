# Back-end do painel admin (GIC)

Login real com JWT, gestão de usuários e persistência do conteúdo do `PainelAdmin` no PostgreSQL.
Tudo fica em `server/admin/`, e o mesmo código roda de duas formas:

- **Produção (Vercel):** `api/admin.mjs` é uma função serverless, no mesmo modelo do seu `api/chat.mjs`.
  O `vercel.json` encaminha `/api/admin/*` e `/api/conteudo` para ela.
- **Local:** o `server/server.js` (usado só nos seus testes) ganhou uma linha, `montarAdmin(app)`.
  Se você não usa o Express local para o admin, pode ignorar essa mudança.

O chatbot (`api/chat.mjs` e `server.js`) continua exatamente como estava.

## Como colocar para rodar

```bash
cd portal-calouro

# 1. dependências novas
npm install pg jsonwebtoken bcryptjs

# 2. scripts: acrescente em "scripts" do package.json
#    "admin:migrar": "node server/admin/scripts/migrar.js",
#    "admin:criar-usuario": "node server/admin/scripts/criar-usuario.js",
#    "admin:test": "node --test server/admin/tests/conteudo.test.js"

# 3. variáveis: copie .env.example para .env e preencha DATABASE_URL e JWT_SECRET

# 4. banco: rode o seu GIC_POSTGRE_FINALIZADO.sql (veja "Ajustes no seu SQL") e depois
npm run admin:migrar

# 5. primeiro administrador (pede nome, e-mail e senha no terminal)
npm run admin:criar-usuario

# 6. subir
npm run server          # API local em :3001 (usa o server.js)
npm run dev             # front (o proxy do Vite já manda /api para :3001)
```

## Publicar na Vercel

1. Copie `api/admin.mjs` e `vercel.json` para a raiz do `portal-calouro` (se já tiver um `vercel.json`, só acrescente as duas `rewrites`).
2. Em **Project Settings > Environment Variables**, cadastre `DATABASE_URL`, `DB_SSL=true` e `JWT_SECRET` (e `CORS_ORIGINS` só se o site e a API ficarem em domínios diferentes; do jeito atual, `/api/...` relativo, não precisa).
3. Rode `npm run admin:migrar` e `npm run admin:criar-usuario` **da sua máquina**, com o `.env` apontando para o mesmo banco. Isso é feito uma vez e não roda na Vercel.
4. Faça o deploy. O front já usa caminhos relativos (`/api/...`), então não precisa de `VITE_API_URL`.

Cuidados específicos de serverless:
- Use a URL do **pooler** do banco (Supabase: porta 6543). Cada execução abre conexões novas, e o banco tem limite.
- O limite de tentativas de login fica na memória de cada instância, que é descartada com frequência. Ele ajuda, mas não é uma barreira rígida. Se isso preocupar, dá para mover o contador para o banco.
- A Vercel limita o corpo da requisição a 4,5 MB e o tempo da função a 10 s no plano gratuito. O painel inteiro hoje tem cerca de 150 KB, bem longe disso.

## Ajustes no seu SQL (`GIC_POSTGRE_FINALIZADO.sql`)

Duas coisas impedem o arquivo de rodar como está:

1. A linha `========` antes dos `CREATE INDEX` é erro de sintaxe. Apague.
2. A última policy usa `auth.role()`, que só existe no Supabase. Em Postgres comum, apague a linha.
   O servidor conecta direto no banco, então não depende dessas policies.

Se o banco for **Supabase**: as tabelas `cursos`, `disciplinas`, `matrizes_curriculares` etc. não têm RLS ligado
e ficariam graváveis por quem tiver a chave pública da API. Rode `ALTER TABLE <tabela> ENABLE ROW LEVEL SECURITY;`
em todas que o site não deva expor (o back-end não é afetado).

## Rotas

| Método | Rota | Quem |
|---|---|---|
| POST | `/api/admin/auth/login` `{email, senha}` → `{token, usuario}` | público (limitado a 5 erros / 15 min por IP+e-mail) |
| GET | `/api/admin/auth/me` | logado |
| POST | `/api/admin/auth/senha` `{senhaAtual, novaSenha}` | logado |
| GET | `/api/admin/conteudo` → `{revisao, conteudo}` | ADMIN, EDITOR |
| PUT | `/api/admin/conteudo` `{revisao, conteudo}` → `{revisao, conteudo}` | ADMIN, EDITOR |
| GET / POST / PATCH `:id` / DELETE `:id` | `/api/admin/usuarios` | só ADMIN |
| GET | `/api/conteudo` → `{conteudo}` | público (sem prompt e base da IA) |

Requisições autenticadas levam `Authorization: Bearer <token>`.

## Como o conteúdo do painel vira tabelas

O painel trabalha com 13 "coleções" num único objeto. O `PUT` recebe o objeto inteiro (ou só algumas
chaves) e grava tudo **numa transação**: salva por inteiro ou não salva nada.

| Coleção do painel | Onde fica |
|---|---|
| `d_cursos` | `cursos` |
| `d_disciplinas` | `disciplinas` + `matrizes_curriculares` + `pre_requisitos` |
| `home_noticias` | `avisos` |
| `ia_conhecimento` | `faqs_chatbot` (o `contador_acessos` nunca é alterado) |
| `home_hero`, `c_*`, `op_*`, `ia_config` | `conteudo_site` (JSONB), pois o schema não tem tabela equivalente |

Decisões de mapeamento que vale conhecer:

- **Tipos de disciplina:** o enum só tinha OBRIGATORIA/ELETIVA e o painel tem 5 tipos. A migração acrescenta
  EXTENSAO, ENFASE e ESTAGIO.
- **Período `N` (ênfase) e `C` (catálogo):** guardados em `matrizes_curriculares.periodo_grupo`; `periodo_ideal` fica 0.
- **Disciplinas sem código** (as "Eletiva" do fluxo): `cod_disciplina` é UNIQUE NOT NULL, então recebem `SEM-<id>`
  e o painel continua vendo `—`.
- **Pré-requisitos:** o painel usa nomes; o servidor resolve para ids dentro do mesmo curso. Nome que não existe
  retorna erro 422 dizendo qual. Correquisitos e equivalências antigas ficam em colunas de `disciplinas`
  (não há tabela para isso; a tabela `equivalencias` não é usada pelo painel).
- **Matriz:** cada curso ganha uma versão "Matriz vigente" (`versoes_matrizes`) automaticamente.
- **Primeira gravação nunca apaga.** Só depois que o painel salvou uma coleção uma vez é que itens removidos
  no painel são removidos do banco. Assim, dados que você já tinha no banco não somem de surpresa.
- **Edição simultânea:** o `GET` devolve `revisao`; se o `PUT` mandar uma revisão antiga, recebe 409.
- Tabelas não usadas pelo painel (`eventos_calendario`, `links_e_hub`, `pesquisas_*`, `equivalencias`) ficam intocadas.

## Ligando o front (3 pontos)

`src/admin/apiAdmin.ts` já está pronto. Faltam estes ajustes nos seus arquivos:

**1. `LoginAdmin.tsx`** — troque o login fixo pela chamada à API:

```tsx
import { apiAdmin } from './apiAdmin';

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setErro('');
  if (!email.trim() || !senha.trim()) { setErro('Preencha o e-mail e a senha.'); return; }
  try {
    await apiAdmin.login(email.trim(), senha);
    onLoginSucesso();
  } catch (err: any) {
    setErro(err.message);
  }
};
```
Apague também a dica `Use: admin@ic.ufal.br e admin123` e o login temporário. **Essas credenciais estão no código do site, visíveis para qualquer visitante.**

**2. `AreaAdmin.tsx`** — a sessão passa a ser o token:

```tsx
const [logado, setLogado] = useState(() => apiAdmin.temSessao());
const handleLogin = () => setLogado(true);
const handleLogout = () => { apiAdmin.logout(); setLogado(false); };
```

**3. `PainelAdmin.tsx`** — carregar e salvar pela API (no lugar de `repositorio.carregar()/salvar()`):

```tsx
const [estado, setEstado] = useState(() => estadoInicial());
const [revisao, setRevisao] = useState<number | null>(null);

useEffect(() => {
  apiAdmin.carregar()
    .then(({ revisao, conteudo }) => { setEstado({ ...estadoInicial(), ...conteudo }); setRevisao(revisao); })
    .catch((e) => { if (e.status === 401) onLogout(); else aviso(e.message); });
}, []);

const salvarTudo = async () => {
  try {
    const r = await apiAdmin.salvar(estado, revisao);
    setEstado({ ...estadoInicial(), ...r.conteudo });   // ids definitivos vindos do banco
    setRevisao(r.revisao);
    setSujo(false);
    aviso('Alterações salvas.');
  } catch (e: any) {
    if (e.status === 401) onLogout(); else aviso(e.message);
  }
};
```

**Na primeira vez**, o banco está vazio e o painel mostra os dados iniciais embutidos no código. Clique em **Salvar**
uma vez para gravá-los no banco.

**Para o site público refletir as edições** (hoje `useConteudo()` lê o `localStorage` de cada navegador, então só
quem editou vê a mudança), troque-o por:

```tsx
export function useConteudo() {
  const [c, setC] = useState(() => estadoInicial());
  useEffect(() => {
    apiAdmin.conteudoPublico().then(({ conteudo }) => setC((p) => ({ ...p, ...conteudo }))).catch(() => {});
  }, []);
  return c;
}
```

## Segurança, em resumo

Senhas com bcrypt (custo 12); JWT HS256 com expiração, revalidado no banco a cada requisição (usuário removido ou
rebaixado perde acesso na hora); SQL 100% parametrizado; links de notícias e oportunidades só aceitam `http(s)`;
erros internos não vazam detalhes. O token fica em `sessionStorage` (some ao fechar a aba). Na Vercel o HTTPS já vem ativo.

## O que foi e o que NÃO foi testado

`npm run admin:test` roda 13 testes (validação com os dados reais do painel, ida e volta banco↔painel, fluxo de
gravação com cliente de banco falso, limitador, tradução de erros).

**Não foi possível testar contra um PostgreSQL real, subir o Express nem fazer deploy na Vercel** neste ambiente (sem rede para instalar
`pg`/`express`). O SQL foi revisado, mas faça este roteiro uma vez: migrar → criar usuário → logar → Salvar no
painel → recarregar a página e conferir que tudo voltou. Se algo falhar, a mensagem de erro traz o motivo.

Outro ponto já existente no seu projeto: o `server.js` importa `@google/genai`, mas o `package.json` do
`portal-calouro` lista `openai`. Se o servidor não subir por isso, rode `npm install @google/genai`.
